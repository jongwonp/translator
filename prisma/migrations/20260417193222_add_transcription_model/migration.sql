-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Script" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "sourceLanguage" TEXT NOT NULL,
    "targetLanguage" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "transcriptionModel" TEXT NOT NULL DEFAULT 'whisper-1',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Script_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Script" ("createdAt", "id", "sourceLanguage", "status", "targetLanguage", "title", "url", "userId") SELECT "createdAt", "id", "sourceLanguage", "status", "targetLanguage", "title", "url", "userId" FROM "Script";
DROP TABLE "Script";
ALTER TABLE "new_Script" RENAME TO "Script";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
