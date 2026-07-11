# Seller Portal Backend Integration Guide

This document outlines the backend requirements and integration points for the new seller portal shop configuration pages.

## Summary

The frontend now includes comprehensive shop configuration pages. The following backend extensions are needed to fully support these features:

## 1. Shop Model Extensions

### Current Fields
- ✓ name
- ✓ slug (read-only for sellers)
- ✓ description
- ✓ city
- ✓ logo/logo_url/logo_public_id
- ✓ banner_image/banner_url/banner_public_id
- ✓ pickup_available
- ✓ delivery_available
- ✓ is_active

### Required New Fields
- [ ] short_description (CharField, max_length=100, blank=True)
- [ ] category (CharField with choices: food, crafts, clothing, home, other)
- [ ] phone (CharField, max_length=30, blank=True)
- [ ] email (EmailField, blank=True)
- [ ] website (URLField, max_length=500, blank=True)
- [ ] address (TextField, blank=True)
- [ ] postal_code (CharField, max_length=20, blank=True)
- [ ] country (CharField, max_length=100, blank=True)

### Migration Note
- Add migration to create these fields
- Update ShopSerializer to include these fields in the output
- Phone, email, website are seller communication channels
- Ensure read-only fields for is_approved remain protected

## 2. ShopSettings Model Extensions

### Current Fields
- ✓ order_acceptance_mode (manual/auto)
- ✓ local_delivery_fee
- ✓ international_delivery_fee
- ✓ free_delivery_above
- ✓ delivery_notes
- ✓ whatsapp_number
- ✓ bank_transfer_instructions

### Required New Fields
- [ ] notification_email (EmailField, blank=False, required for receiving alerts)
- [ ] new_order_email_enabled (BooleanField, default=True)
- [ ] cancellation_request_email_enabled (BooleanField, default=True)
- [ ] low_stock_notification_enabled (BooleanField, default=False)
- [ ] supported_delivery_countries (JSONField or through separate model, stores list of country codes)

### Migration Note
- Add migration to create notification fields
- Default notification_email to shop owner's email
- Update ShopSettingsSerializer to include these fields

## 3. OpeningHours Model (New)

Create a new model to store opening hours:

```python
class OpeningHours(models.Model):
    DAY_CHOICES = [
        (0, 'Sunday'),
        (1, 'Monday'),
        (2, 'Tuesday'),
        (3, 'Wednesday'),
        (4, 'Thursday'),
        (5, 'Friday'),
        (6, 'Saturday'),
    ]
    
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='opening_hours')
    day_of_week = models.IntegerField(choices=DAY_CHOICES)
    is_closed = models.BooleanField(default=False)
    opening_time = models.TimeField(null=True, blank=True)
    closing_time = models.TimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ('shop', 'day_of_week')
        ordering = ['day_of_week']
```

Create a related serializer and endpoint:

```python
class OpeningHoursSerializer(serializers.ModelSerializer):
    class Meta:
        model = OpeningHours
        fields = ['day_of_week', 'is_closed', 'opening_time', 'closing_time']

# In SellerShopView or separate endpoint
def get_opening_hours(self, request):
    hours = request.user.seller_profile.shop.opening_hours.all()
    return Response(OpeningHoursSerializer(hours, many=True).data)

def update_opening_hours(self, request):
    # Accept list of opening hour objects and update/create as needed
    shop = request.user.seller_profile.shop
    # Implement bulk update logic
```

## 4. Existing API Endpoints (Already Implemented)

### GET /api/seller/shop/
Returns shop details and settings
- Used by: SellerShopDetailsPage

### PATCH /api/seller/shop/
Updates shop details (name, description, city, logo, banner, etc.)
- **Authorization**: IsSeller permission - seller can only update their own shop
- **Security**: slug is not updatable by seller; is_approved is read-only
- Used by: SellerShopDetailsPage, SellerShopLogoBannerPage

### GET /api/seller/settings/ & PATCH /api/seller/settings/
Returns and updates shop settings (delivery fees, order acceptance, etc.)
- **Authorization**: IsSeller permission
- Used by: SellerShopDeliveryPage, SellerShopOrderSettingsPage

## 5. New API Endpoints Required

### Image Upload: POST /api/seller/shop/upload-image/
**Not yet implemented** - May already be handled by PATCH /api/seller/shop/ with multipart

Request:
```json
{
  "file": <file>,
  "type": "logo" | "banner"
}
```

Response:
```json
{
  "url": "https://cloudinary.com/...",
  "publicId": "gw-marketplace-fe/shop/logo-abc123"
}
```

### Image Removal: DELETE /api/seller/shop/remove-image/
**Not yet implemented**

Request:
```json
{
  "type": "logo" | "banner"
}
```

### Opening Hours: GET/PUT /api/seller/shop/opening-hours/
**Not yet implemented**

## 6. Frontend Integration Points

The frontend expects the following API responses:

### Shop Details (from GET /api/seller/shop/)
```typescript
{
  name: string
  slug: string // read-only
  description: string
  shortDescription: string
  category: string
  phone: string
  email: string
  website: string
  address: string
  city: string
  postalCode: string
  country: string
  isActive: boolean
  logoUrl: string
  bannerUrl: string
}
```

### Settings (from GET /api/seller/settings/)
```typescript
{
  orderAcceptanceMode: 'manual' | 'auto'
  minOrderAmount: number
  nlDeliveryFee: number
  internationalDeliveryFee: number
  freeDeliveryThreshold: number
  deliveryNotes: string
  pickupEnabled: boolean
  pickupInstructions: string
  deliveryEnabled: boolean
  supportedCountries: string[]
  notificationEmail: string
  newOrderEmailEnabled: boolean
  cancellationRequestEmailEnabled: boolean
  lowStockNotificationEnabled: boolean
}
```

### Opening Hours (from GET /api/seller/shop/opening-hours/)
```typescript
[
  {
    dayOfWeek: number // 0-6
    isClosed: boolean
    openTime: string // "HH:MM"
    closeTime: string // "HH:MM"
  }
]
```

## 7. Security Requirements

### Authorization
- ✓ Every seller endpoint requires `IsSeller` permission (authenticated seller)
- ✓ Sellers can only access/modify their own shop
- ✓ Never accept arbitrary shop IDs from frontend - use `request.user.seller_profile.shop`

### Read-Only Fields
- ✓ `slug` - only admin can modify
- ✓ `is_approved` - only admin approval, seller cannot self-approve
- ✓ `created_at`, `updated_at` - system managed

### Validation
- [ ] Phone numbers should be validated (basic format check)
- [ ] Email must be valid
- [ ] URLs must be valid
- [ ] Delivery fees must be non-negative
- [ ] Opening hours times must be valid (closing >= opening)

### Image Uploads
- [ ] Validate image file size (max 5MB frontend, enforce on backend)
- [ ] Validate image MIME type (image/png, image/jpeg, image/webp)
- [ ] Use existing cloudinary_service for uploads
- [ ] Return public URL and public_id

## 8. Implementation Checklist

- [ ] Add new fields to Shop model
- [ ] Add new fields to ShopSettings model
- [ ] Create OpeningHours model
- [ ] Create database migrations
- [ ] Update ShopSerializer
- [ ] Update ShopSettingsSerializer
- [ ] Create OpeningHoursSerializer
- [ ] Implement opening hours endpoints
- [ ] Implement image upload/remove endpoints
- [ ] Add input validation
- [ ] Test seller permission enforcement
- [ ] Test slug immutability
- [ ] Test approval field read-only status
- [ ] Document API for frontend developers

## 9. Testing

### Unit Tests
- Seller cannot modify another seller's shop
- Seller cannot set is_approved
- Seller cannot change slug
- Image uploads work with valid files
- Invalid files are rejected

### Integration Tests
- Full shop configuration workflow
- Opening hours creation/update
- Notification settings apply correctly
- Email sending respects notification settings

## 10. References

- Frontend: `/gw-marketplace-fe/src/seller/SellerShop*.tsx`
- Backend Serializers: `/apps/marketplace/serializers.py`
- Backend Models: `/apps/marketplace/models.py`
- Backend Views: `/apps/marketplace/views.py`
- Cloudinary Service: `/apps/marketplace/cloudinary_service.py`
