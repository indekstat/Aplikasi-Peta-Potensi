from django.db import models

class Province(models.Model):
    name = models.CharField(max_length=100, unique=True)
    geojson_url = models.URLField(null=True, blank=True)

    def __str__(self):
        return self.name

class District(models.Model):
    province = models.ForeignKey(Province, on_delete=models.CASCADE, related_name='districts')
    name = models.CharField(max_length=100)
    lat = models.FloatField(default=0.0)
    lon = models.FloatField(default=0.0)

    def __str__(self):
        return self.name

class SubDistrict(models.Model):
    district = models.ForeignKey(District, on_delete=models.CASCADE, related_name='subdistricts')
    name = models.CharField(max_length=100)
    lat = models.FloatField(default=0.0)
    lon = models.FloatField(default=0.0)

    def __str__(self):
        return self.name

class Subsector(models.Model):
    name = models.CharField(max_length=200, unique=True)
    icon = models.CharField(max_length=50, blank=True, null=True, help_text="Emoji icon")

    def __str__(self):
        return self.name

class Commodity(models.Model):
    name = models.CharField(max_length=200, unique=True)
    icon = models.CharField(max_length=50, blank=True, null=True, help_text="Emoji icon")

    def __str__(self):
        return self.name

class PdrbData(models.Model):
    year = models.IntegerField()
    district = models.ForeignKey(District, on_delete=models.CASCADE, null=True, blank=True)
    subsector = models.ForeignKey(Subsector, on_delete=models.CASCADE)
    value = models.FloatField(default=0.0)

    class Meta:
        unique_together = ('year', 'district', 'subsector')

class ProductionData(models.Model):
    year = models.IntegerField()
    subdistrict = models.ForeignKey(SubDistrict, on_delete=models.CASCADE, null=True, blank=True)
    commodity = models.ForeignKey(Commodity, on_delete=models.CASCADE)
    value = models.FloatField(default=0.0)

    class Meta:
        unique_together = ('year', 'subdistrict', 'commodity')
