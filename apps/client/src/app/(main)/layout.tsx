import HealthCheckGate from "@/components/HealthCheckGate";
import AddToHomeScreenPrompt from "@/components/AddToHomeScreenPrompt";

export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <AddToHomeScreenPrompt />
            <HealthCheckGate>{children}</HealthCheckGate>
        </>
    );
}
