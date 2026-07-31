import Link from "next/link";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPrice, type Product } from "@/lib/products";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Card className="gap-0 rounded-none py-0 shadow-xs ring-border/20">
      <Link href={`/products/${product.slug}`} className="block">
        <div
          className="relative aspect-[4/3] overflow-hidden bg-muted"
          style={{ background: `linear-gradient(145deg, ${product.tint}, oklch(0.25 0 0) 85%)` }}
        >
          <p className="absolute bottom-4 left-4 text-2xl font-bold text-white/90">
            {product.name.split(" ")[0]}
          </p>
          {!product.inStock && (
            <Badge className="absolute right-3 top-3" variant="secondary">
              нет в наличии
            </Badge>
          )}
        </div>
      </Link>
      <CardHeader className="gap-2 pt-4">
        <p className="text-xs text-muted-foreground">{product.category}</p>
        <CardTitle className="text-lg">
          <Link href={`/products/${product.slug}`} className="hover:underline">
            {product.name}
          </Link>
        </CardTitle>
        <CardDescription className="line-clamp-2">{product.shortDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-base font-semibold">{formatPrice(product)}</p>
      </CardContent>
      <CardFooter className="gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          render={<Link href={`/products/${product.slug}`} />}
        >
          Подробнее
        </Button>
        <AddToCartButton product={product} size="sm" className="flex-1" />
      </CardFooter>
    </Card>
  );
}
