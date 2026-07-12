from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DistrictViewSet, SubsectorViewSet, CommodityViewSet,
    PdrbDataViewSet, ProductionDataViewSet, get_lq_analysis
)

router = DefaultRouter()
router.register(r'districts', DistrictViewSet)
router.register(r'subsectors', SubsectorViewSet)
router.register(r'commodities', CommodityViewSet)
router.register(r'pdrb', PdrbDataViewSet)
router.register(r'production', ProductionDataViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('analysis/lq/', get_lq_analysis, name='lq_analysis'),
]
