# Render Uploads Storage

## Purpose

The backend stores uploaded files such as course images, institute logos, trainer avatars, and payment receipts under `/uploads`.

## Required Render Setting

Render local filesystem storage is ephemeral unless a Persistent Disk is attached to the service.

Set this environment variable in the Render backend service:

```text
UPLOADS_DIR=/var/data/uploads
```

Add a Persistent Disk to the same Render Web Service:

```text
Mount Path: /var/data
```

After changing this setting, redeploy the backend.

## Important

Images uploaded before the Persistent Disk was added may already be lost after a Render restart or redeploy. Re-upload those images from the app after the disk is attached.
