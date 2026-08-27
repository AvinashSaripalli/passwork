-- Rename folder access levels to department-style vocabulary
ALTER TYPE "FolderAccessLevel" RENAME VALUE 'VIEWER' TO 'READ_ONLY';
ALTER TYPE "FolderAccessLevel" RENAME VALUE 'EDITOR' TO 'READ_WRITE';
ALTER TYPE "FolderAccessLevel" RENAME VALUE 'MANAGER' TO 'FULL_ACCESS';
ALTER TYPE "FolderAccessLevel" RENAME VALUE 'ADMIN' TO 'ADMINISTRATOR';
ALTER TYPE "FolderAccessLevel" ADD VALUE 'FORBIDDEN';

-- Rename vault access levels to department-style vocabulary
ALTER TYPE "VaultAccessLevel" RENAME VALUE 'VIEWER' TO 'READ_ONLY';
ALTER TYPE "VaultAccessLevel" RENAME VALUE 'EDITOR' TO 'READ_WRITE';
ALTER TYPE "VaultAccessLevel" RENAME VALUE 'MANAGER' TO 'FULL_ACCESS';
ALTER TYPE "VaultAccessLevel" RENAME VALUE 'ADMIN' TO 'ADMINISTRATOR';