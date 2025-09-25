# Category Type Field

تم إضافة حقل `type` إلى Category schema لتصنيف الفئات حسب نوعها.

## الأنواع المتاحة

- `headphones` - للفئات المتعلقة بالسماعات
- `keyboards` - للفئات المتعلقة بلوحات المفاتيح
- `mice` - للفئات المتعلقة بالفئران
- `monitors` - للفئات المتعلقة بالشاشات
- `accessories` - للفئات المتعلقة بالإكسسوارات والأدوات الأخرى

## كيفية الاستخدام

### إنشاء فئة جديدة

```json
POST /category
{
  "name": "Gaming Headphones",
  "type": "headphones"
}
```

### تحديث فئة موجودة

```json
PATCH /category/update/:categoryId
{
  "name": "Updated Name",
  "type": "keyboards"
}
```

### البحث حسب النوع

```json
GET /category/AllCategory?type=headphones
```

### البحث حسب الاسم والنوع معاً

```json
GET /category/AllCategory?name=gaming&type=keyboards
```

## ملاحظات

- إذا لم يتم تحديد `type` عند الإنشاء، سيتم تعيين القيمة الافتراضية `accessories`
- حقل `type` إجباري في الـ schema ولكن اختياري في الـ DTO للتوافق مع البيانات الموجودة
- يمكن البحث في الفئات حسب النوع باستخدام query parameter `type`