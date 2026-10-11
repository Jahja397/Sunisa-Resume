# export-excel-pdf.js (ปิดใช้งาน)

โค้ดส่งออกข้อมูลเป็น **Excel (หลายชีต)** และ **PDF/รายงาน HTML** ที่เคยมีในแท็บ Export
ถูกเอาออกจาก UI ตามที่ผู้ใช้ต้องการ และ **ไม่ได้ถูกโหลดใน `index.html`**

ถ้าจะเปิดกลับมา:
1. เพิ่ม SheetJS ก่อนสคริปต์อื่น: `<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>`
2. เพิ่ม `<script src="js/legacy/export-excel-pdf.js"></script>` ต่อจาก `07-extras-views.js`
3. เพิ่มแท็บ `['exp','📤','Export','Export']` ใน `SUBS` (`05-extras-core.js`) และ `<div id="psheet"></div>` + CSS พิมพ์ถ้าต้องการ PDF
4. การดาวน์โหลดผ่านเบราว์เซอร์ปกติใช้ `blobDl()` ใน `13-backup-files.js` (ในโค้ดเดิมใช้ `claude.use('downloads')`)
