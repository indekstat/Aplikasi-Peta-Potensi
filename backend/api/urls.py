from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProvinceViewSet, DistrictViewSet, SubDistrictViewSet,
    SubsectorViewSet, CommodityViewSet, PdrbDataViewSet, ProductionDataViewSet,
    get_lq_analysis
)
from .views_save import save_data

router = DefaultRouter()
router.register(r'provinces', ProvinceViewSet)
router.register(r'districts', DistrictViewSet)
router.register(r'subdistricts', SubDistrictViewSet)
router.register(r'subsectors', SubsectorViewSet)
router.register(r'commodities', CommodityViewSet)
router.register(r'pdrb', PdrbDataViewSet)
router.register(r'production', ProductionDataViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('analysis/lq/', get_lq_analysis, name='lq-analysis'),
    path('save-data/', save_data, name='save-data'),
]
