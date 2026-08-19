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
    kelompok_utama = models.CharField(max_length=100, blank=True, null=True)
    subkelompok = models.CharField(max_length=100, blank=True, null=True)
    icon = models.CharField(max_length=50, blank=True, null=True, help_text="Emoji icon")

    def __str__(self):
        return self.name

class PdrbData(models.Model):
    year = models.IntegerField()
    province = models.ForeignKey(Province, on_delete=models.CASCADE, null=True, blank=True)
    district = models.ForeignKey(District, on_delete=models.CASCADE, null=True, blank=True)
    subsector = models.ForeignKey(Subsector, on_delete=models.CASCADE)
    value = models.FloatField(default=0.0)

    class Meta:
        unique_together = ('year', 'province', 'district', 'subsector')

class ProductionData(models.Model):
    year = models.IntegerField()
    district = models.ForeignKey(District, on_delete=models.CASCADE, null=True, blank=True, related_name='production_data')
    subdistrict = models.ForeignKey(SubDistrict, on_delete=models.CASCADE, null=True, blank=True, related_name='production_data')
    commodity = models.ForeignKey(Commodity, on_delete=models.CASCADE)
    value = models.FloatField(default=0.0)

    class Meta:
        unique_together = ('year', 'district', 'subdistrict', 'commodity')

from django.contrib.auth.models import User

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    asal_provinsi = models.CharField(max_length=100, blank=True, null=True)
    asal_kokab = models.CharField(max_length=100, blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    
    def __str__(self):
        return f"{self.user.username} Profile"

class UserActivity(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activities')
    action = models.CharField(max_length=255)
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user.username} - {self.action} at {self.timestamp}"
