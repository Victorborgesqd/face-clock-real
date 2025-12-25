-- Adicionar coluna de código/barcode aos produtos
ALTER TABLE public.products
ADD COLUMN code TEXT UNIQUE;

-- Criar bucket para fotos de produtos
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-photos', 'product-photos', true);

-- Política para visualização pública das fotos
CREATE POLICY "Anyone can view product photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'product-photos');

-- Política para admins fazerem upload de fotos
CREATE POLICY "Admins can upload product photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'product-photos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Política para admins atualizarem fotos
CREATE POLICY "Admins can update product photos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'product-photos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Política para admins excluírem fotos
CREATE POLICY "Admins can delete product photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'product-photos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);