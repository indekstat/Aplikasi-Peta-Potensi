from rest_framework import serializers
from .models import Province, District, SubDistrict, Subsector, Commodity, PdrbData, ProductionData

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
    subdistrict_name = serializers.CharField(source='subdistrict.name', read_only=True, allow_null=True)
    commodity_name = serializers.CharField(source='commodity.name', read_only=True)

    class Meta:
        model = ProductionData
        fields = '__all__'
