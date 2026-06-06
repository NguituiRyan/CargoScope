-- Custom SQL migration file, put your code below! --

-- Widen the chat-attachments bucket to accept common business documents
-- (previously images + PDF only) so manufacturers can share Word/Excel/
-- PowerPoint/CSV/text files in chat. Kept in sync with
-- src/lib/messaging/attachments.ts.
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv'
]
where id = 'chat-attachments';
--> statement-breakpoint
-- Repair the product detail gallery: media rows seeded with the generic
-- placeholder for products that DO have real artwork (the generated catalogue)
-- now point at the product's primary image. Idempotent and a no-op on a fresh
-- (empty) product_media table.
update product_media pm
set url = p.primary_image_url
from products p
where pm.product_id = p.id
  and pm.type = 'image'
  and pm.url = '/img/product-placeholder.svg'
  and p.primary_image_url is not null
  and p.primary_image_url <> '/img/product-placeholder.svg';
