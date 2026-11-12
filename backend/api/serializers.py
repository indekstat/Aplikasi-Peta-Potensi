from rest_framework import serializers
from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from .models import Province, District, SubDistrict, Subsector, Commodity, PdrbData, ProductionData, UserProfile, UserActivity, Desa

class DesaRingkasSerializer(serializers.ModelSerializer):
    class Meta:
        model = Desa
        fields = ['iddesa', 'nama_desa', 'nama_kec', 'nama_kab', 'nama_prov']


class UserProfileSerializer(serializers.ModelSerializer):
    desa = DesaRingkasSerializer(read_only=True)

    class Meta:
        model = UserProfile
        fields = ['asal_provinsi', 'asal_kokab', 'phone_number', 'account_type', 'desa']

class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'profile', 'is_superuser']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    asal_provinsi = serializers.CharField(write_only=True, required=False)
    asal_kokab = serializers.CharField(write_only=True, required=False)
    phone_number = serializers.CharField(write_only=True, required=False)
    # 'koperasi' = akun level desa; wajib memilih desa lewat desa_id (iddesa Podes 10 digit).
    account_type = serializers.ChoiceField(
        choices=[UserProfile.TIPE_DAERAH, UserProfile.TIPE_KOPERASI], write_only=True, required=False,
        default=UserProfile.TIPE_DAERAH)
    desa_id = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['username', 'password', 'email', 'first_name', 'asal_provinsi', 'asal_kokab', 'phone_number',
                  'account_type', 'desa_id']

    def validate(self, attrs):
        if attrs.get('account_type') == UserProfile.TIPE_KOPERASI:
            iddesa = (attrs.get('desa_id') or '').strip()
            if not iddesa:
                raise serializers.ValidationError({"desa_id": "Desa wajib dipilih."})
            desa = Desa.objects.filter(iddesa=iddesa).first()
            if not desa:
                raise serializers.ValidationError({"desa_id": "Desa tidak ditemukan."})
            if UserProfile.objects.filter(desa=desa).exists():
                raise serializers.ValidationError({"desa_id": "Desa ini sudah memiliki akun koperasi."})
            attrs['desa'] = desa
            return attrs

        asal_kokab = attrs.get('asal_kokab')
        if asal_kokab:
            # Aturan "satu kokab satu akun" hanya untuk akun daerah; akun koperasi tidak ikut dihitung.
            existing_profile = UserProfile.objects.filter(
                asal_kokab=asal_kokab, account_type=UserProfile.TIPE_DAERAH).first()
            if existing_profile:
                raise serializers.ValidationError({"asal_kokab": f"Kokab sudah memiliki akun dengan username {existing_profile.user.username}"})
        return attrs

    def create(self, validated_data):
        tipe = validated_data.pop('account_type', UserProfile.TIPE_DAERAH)
        desa = validated_data.pop('desa', None)
        validated_data.pop('desa_id', None)
        asal_provinsi = validated_data.pop('asal_provinsi', '')
        asal_kokab = validated_data.pop('asal_kokab', '')
        phone_number = validated_data.pop('phone_number', '')
        if tipe == UserProfile.TIPE_KOPERASI:
            # Wilayah akun koperasi cukup lewat desanya; sengaja tidak mengisi asal_kokab agar
            # tidak pernah dianggap pemilik data PDRB kabupaten.
            asal_provinsi, asal_kokab = '', ''

        try:
            with transaction.atomic():
                user = User.objects.create_user(
                    username=validated_data['username'],
                    email=validated_data.get('email', ''),
                    password=validated_data['password'],
                    first_name=validated_data.get('first_name', '')
                )
                UserProfile.objects.create(
                    user=user,
                    asal_provinsi=asal_provinsi,
                    asal_kokab=asal_kokab,
                    phone_number=phone_number,
                    account_type=tipe,
                    desa=desa,
                )
        except IntegrityError:
            # Dua pendaftaran serentak untuk desa yang sama: unique di database menolak yang kedua.
            raise serializers.ValidationError({"desa_id": "Desa ini sudah memiliki akun koperasi."})

        return user


class ProvinceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Province
        fields = '__all__'

class DistrictSerializer(serializers.ModelSerializer):
    province_name = serializers.CharField(source='province.name', read_only=True)
    class Meta:
        model = District
        fields = '__all__'

class SubDistrictSerializer(serializers.ModelSerializer):
    district_name = serializers.CharField(source='district.name', read_only=True)
    class Meta:
        model = SubDistrict
        fields = '__all__'

class SubsectorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subsector
        fields = '__all__'

class CommoditySerializer(serializers.ModelSerializer):
    class Meta:
        model = Commodity
        fields = '__all__'

class PdrbDataSerializer(serializers.ModelSerializer):
    district_name = serializers.CharField(source='district.name', read_only=True, allow_null=True)
    subsector_name = serializers.CharField(source='subsector.name', read_only=True)

    class Meta:
        model = PdrbData
        fields = '__all__'

class ProductionDataSerializer(serializers.ModelSerializer):
    district_name = serializers.CharField(source='district.name', read_only=True, allow_null=True)
    subdistrict_name = serializers.CharField(source='subdistrict.name', read_only=True, allow_null=True)
    commodity_name = serializers.CharField(source='commodity.name', read_only=True)

    class Meta:
        model = ProductionData
        fields = '__all__'

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)

class UserActivitySerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    kokab = serializers.CharField(source='user.profile.asal_kokab', read_only=True)
    
    class Meta:
        model = UserActivity
        fields = ['id', 'username', 'kokab', 'action', 'timestamp', 'ip_address']
