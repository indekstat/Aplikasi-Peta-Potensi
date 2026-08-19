from django.urls import path, re_path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProvinceViewSet, DistrictViewSet, SubDistrictViewSet,
    SubsectorViewSet, CommodityViewSet, PdrbDataViewSet, ProductionDataViewSet,
    get_lq_analysis
)
from .views_save import save_data, get_pdrb_by_kab, get_production_data
from .views_auth import RegisterView, CustomTokenObtainPairView, ChangePasswordView
from .views_superadmin import get_users, get_activities, get_pdrb_summary, delete_pdrb_data, reset_user_password
from .views_dashboard import get_dashboard_summary
from rest_framework_simplejwt.views import TokenRefreshView

router = DefaultRouter(trailing_slash=False)
router.register(r'provinces', ProvinceViewSet)
router.register(r'districts', DistrictViewSet)
router.register(r'subdistricts', SubDistrictViewSet)
router.register(r'subsectors', SubsectorViewSet)
router.register(r'commodities', CommodityViewSet)
router.register(r'pdrb', PdrbDataViewSet)
router.register(r'production', ProductionDataViewSet)

urlpatterns = [
    path('', include(router.urls)),
    re_path(r'^auth/register/?$', RegisterView.as_view(), name='auth_register'),
    re_path(r'^auth/login/?$', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    re_path(r'^auth/refresh/?$', TokenRefreshView.as_view(), name='token_refresh'),
    re_path(r'^auth/change-password/?$', ChangePasswordView.as_view(), name='change_password'),
    re_path(r'^analysis/lq/?$', get_lq_analysis, name='lq-analysis'),
    re_path(r'^dashboard/summary/?$', get_dashboard_summary, name='dashboard-summary'),
    re_path(r'^save-data/?$', save_data, name='save-data'),
    re_path(r'^get-pdrb/?$', get_pdrb_by_kab, name='get-pdrb-by-kab'),
    re_path(r'^get-production/?$', get_production_data, name='get-production-data'),
    
    re_path(r'^admin/users/?$', get_users, name='admin-users'),
    re_path(r'^admin/activities/?$', get_activities, name='admin-activities'),
    re_path(r'^admin/pdrb-summary/?$', get_pdrb_summary, name='admin-pdrb-summary'),
    re_path(r'^admin/pdrb-delete/?$', delete_pdrb_data, name='admin-pdrb-delete'),
    re_path(r'^admin/reset-password/?$', reset_user_password, name='admin-reset-password'),
]
