from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Province, District, SubDistrict, Subsector, Commodity, PdrbData, ProductionData, UserProfile, UserActivity

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['asal_provinsi', 'asal_kokab', 'phone_number']

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

    class Meta:
        model = User
        fields = ['username', 'password', 'email', 'first_name', 'asal_provinsi', 'asal_kokab', 'phone_number']

    def validate(self, attrs):
        asal_kokab = attrs.get('asal_kokab')
        if asal_kokab:
            existing_profile = UserProfile.objects.filter(asal_kokab=asal_kokab).first()
            if existing_profile:
                raise serializers.ValidationError({"asal_kokab": f"Kokab sudah memiliki akun dengan username {existing_profile.user.username}"})
        return attrs

    def create(self, validated_data):
        asal_provinsi = validated_data.pop('asal_provinsi', '')
        asal_kokab = validated_data.pop('asal_kokab', '')
        phone_number = validated_data.pop('phone_number', '')

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
            phone_number=phone_number
        )

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
