export const ADMIN_PERMISSIONS = [
  { value: "MANAGE_PAYOUTS", label: "Faturamento", description: "Visualizar e confirmar repasses" },
  { value: "MANAGE_VERIFICATIONS", label: "Verificações", description: "Analisar e aprovar motoristas" },
  { value: "MANAGE_USERS", label: "Usuários", description: "Gerenciar administradores" },
  { value: "MANAGE_SETTINGS", label: "Configurações", description: "Editar regras financeiras da plataforma" },
] as const;

export const PERMISSION_LABELS: Record<string, string> = Object.fromEntries(
  ADMIN_PERMISSIONS.map(({ value, label }) => [value, label]),
);
