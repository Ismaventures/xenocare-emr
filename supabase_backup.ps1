# Config
$LogFile = "C:\Users\Event\Downloads\emr\emr\backup_log.txt"
Start-Transcript -Path $LogFile -Force

$CONTAINER = "supabase_db_Event"
$PGPASSWORD = "postgres" # Make sure this matches your actual local DB password
$BACKUP_ROOT = "C:\supabase-backups"  # your external drive letter
$TIMESTAMP = Get-Date -Format "yyyy-MM-dd_HH-mm"
$BACKUP_DIR = "$BACKUP_ROOT\$TIMESTAMP"

# Create backup folder
New-Item -ItemType Directory -Force -Path $BACKUP_DIR | Out-Null

# ── Database ──────────────────────────────────────────────
Write-Host "Backing up database..."
# Set the password in the context of the current PowerShell session so Docker picks it up
$env:PGPASSWORD = $PGPASSWORD

# Notice this is all on one line to prevent PowerShell formatting issues
docker exec -e PGPASSWORD=$PGPASSWORD $CONTAINER pg_dump -U supabase_admin -d postgres --no-owner --no-acl -F c -f /tmp/backup.dump

# Copy the dump from the container to the external drive
docker cp "${CONTAINER}:/tmp/backup.dump" "$BACKUP_DIR\database.dump"
Write-Host "Database backed up to $BACKUP_DIR\database.dump"

# Clean up the dump inside the container to save space
docker exec $CONTAINER rm /tmp/backup.dump

# ── Storage Buckets ───────────────────────────────────────
Write-Host "Backing up storage buckets..."
# Make sure this container name matches your local storage container name exactly
$STORAGE_CONTAINER = "supabase_storage_Event"

# Copy the entire storage volume out
# Note: Local supabase storage is mounted at /mnt
docker cp "${STORAGE_CONTAINER}:/mnt" "$BACKUP_DIR\storage"
Write-Host "Storage backed up to $BACKUP_DIR\storage"

# ── Cleanup old backups (keep last 7) ─────────────────────
Write-Host "Cleaning up old backups..."
$OLD = Get-ChildItem -Path $BACKUP_ROOT -Directory | Sort-Object CreationTime -Descending | Select-Object -Skip 7
if ($OLD) {
    $OLD | Remove-Item -Recurse -Force
    Write-Host "Cleaned up old backups, keeping last 7."
} else {
    Write-Host "No old backups to clean up yet."
}

Write-Host "Backup complete for $($TIMESTAMP): $BACKUP_DIR"
Stop-Transcript
