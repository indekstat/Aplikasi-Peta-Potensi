from rest_framework.permissions import SAFE_METHODS, BasePermission


def _is_superuser(request):
    user = request.user
    return bool(user and user.is_authenticated and user.is_superuser)


class IsSuperuserOrReadOnly(BasePermission):
    """Data referensi (wilayah, subsektor, komoditas): siapa pun boleh membaca
    (halaman daftar butuh daftar wilayah sebelum login); hanya superuser yang boleh mengubah."""

    def has_permission(self, request, view):
        return request.method in SAFE_METHODS or _is_superuser(request)


class IsAuthenticatedReadSuperuserWrite(BasePermission):
    """Data PDRB/produksi: membaca butuh login; mengubah langsung lewat API hanya superuser.
    User daerah menyimpan data lewat /api/save-data, yang membatasi wilayahnya."""

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        return request.method in SAFE_METHODS or _is_superuser(request)


class IsSuperuserOrKoperasi(BasePermission):
    """Overview Koperasi: hanya superadmin dan akun koperasi desa (akun daerah/DPMPTSP tidak boleh)."""

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.is_superuser:
            return True
        profile = getattr(user, 'profile', None)
        return bool(profile and profile.account_type == 'koperasi')

