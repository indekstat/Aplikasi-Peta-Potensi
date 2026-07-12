from django.db import models

class District(models.Model):
    name = models.CharField(max_length=100, unique=True)
    lat = models.FloatField(default=0.0)
    lon = models.FloatField(default=0.0)

    def __str__(self):
        return self.name

class Subsector(models.Model):
    name = models.CharField(max_length=200, unique=True)

    def __str__(self):
        return self.name

class Commodity(models.Model):
    name = models.CharField(max_length=200, unique=True)

    def __str__(self):
        return self.name

class PdrbData(models.Model):
    district = models.ForeignKey(District, on_delete=models.CASCADE, null=True, blank=True)
    subsector = models.ForeignKey(Subsector, on_delete=models.CASCADE)
    value = models.FloatField(default=0.0)

    class Meta:
        unique_together = ('district', 'subsector')

class ProductionData(models.Model):
    district = models.ForeignKey(District, on_delete=models.CASCADE, null=True, blank=True)
    commodity = models.ForeignKey(Commodity, on_delete=models.CASCADE)
    value = models.FloatField(default=0.0)

    class Meta:
        unique_together = ('district', 'commodity')
