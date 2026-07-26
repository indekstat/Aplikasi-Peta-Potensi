from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth.models import User
from .models import UserActivity, PdrbData
from .serializers import UserSerializer, UserActivitySerializer, PdrbDataSerializer

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_users(request):
    if not request.user.is_superuser:
        return Response({'detail': 'Not authorized'}, status=403)
    users = User.objects.all().order_by('-date_joined')
    serializer = UserSerializer(users, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_activities(request):
    if not request.user.is_superuser:
        return Response({'detail': 'Not authorized'}, status=403)
    activities = UserActivity.objects.all()[:100] # get latest 100
    serializer = UserActivitySerializer(activities, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_pdrb_summary(request):
    if not request.user.is_superuser:
        return Response({'detail': 'Not authorized'}, status=403)
    
    # We want a summary: Which district has how much data for which year
    from django.db.models import Count, Sum
    summary = PdrbData.objects.values('district__province__name', 'district__name', 'year').annotate(count=Count('id'), total_value=Sum('value')).order_by('-year', 'district__province__name', 'district__name')
    
    return Response(list(summary))
