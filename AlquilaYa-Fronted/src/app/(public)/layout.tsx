import { ClientChrome } from '@/components/student/client-chrome';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <ClientChrome />
    </>
  );
}
