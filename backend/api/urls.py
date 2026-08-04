from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProvinceViewSet, DistrictViewSet, SubDistrictViewSet,
    SubsectorViewSet, CommodityViewSet, PdrbDataViewSet, ProductionDataViewSet,
    get_lq_analysis
)
from .views_save import save_data, get_pdrb_by_kab
from .views_auth import RegisterView, CustomTokenObtainPairView, ChangePasswordView
from .views_superadmin import get_users, get_activities, get_pdrb_summary, delete_pdrb_data, reset_user_password
from .views_dashboard import get_dashboard_summary
from rest_framework_simplejwt.views import TokenRefreshView

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
    path('auth/register/', RegisterView.as_view(), name='auth_register'),
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('analysis/lq/', get_lq_analysis, name='lq-analysis'),
    path('dashboard/summary/', get_dashboard_summary, name='dashboard-summary'),
    path('save-data/', save_data, name='save-data'),
    path('get-pdrb/', get_pdrb_by_kab, name='get-pdrb-by-kab'),
    
    path('admin/users/', get_users, name='admin-users'),
    path('admin/activities/', get_activities, name='admin-activities'),
    path('admin/pdrb-summary/', get_pdrb_summary, name='admin-pdrb-summary'),
    path('admin/pdrb-delete/', delete_pdrb_data, name='admin-pdrb-delete'),
    path('admin/reset-password/', reset_user_password, name='admin-reset-password'),
]
