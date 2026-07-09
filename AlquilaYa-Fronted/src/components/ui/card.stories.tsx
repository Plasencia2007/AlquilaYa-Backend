import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
import { Button } from './button';

export default {
  title: 'ui / Card',
};

export const Basic = () => (
  <Card className="max-w-sm">
    <CardHeader>
      <CardTitle>Cuarto en San Isidro</CardTitle>
      <CardDescription>A 8 min a pie de la UPeU</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">
        Cuarto individual amoblado, con baño propio y wifi incluido.
      </p>
    </CardContent>
    <CardFooter>
      <Button className="w-full">Ver detalle</Button>
    </CardFooter>
  </Card>
);
