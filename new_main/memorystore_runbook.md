# Memorystore Provisioning Runbook

## Overview

The `nd6-app` Cloud Run service is already configured for VPC Direct Egress
(`--vpc-egress all-traffic`). Once you provision a Memorystore instance in the
same VPC, all that's needed is to pass its private IP as `VALKEY_HOST` and set
`VALKEY_ENABLED=true`.

---

## Step 0 — Subnet prereq (run once, if not already done)

```bash
gcloud compute networks subnets update default \
    --region=europe-west1 \
    --enable-private-ip-google-access
```

---

## Option A — Memorystore for Redis 7 (recommended, simpler)

Memorystore for Redis uses VPC peering: it assigns a private IP directly inside
your VPC with no extra configuration. The node `redis` client + Valkey-protocol
code we wrote is 100% compatible with Redis 7.

### 1. Enable the API (once)

```bash
gcloud services enable redis.googleapis.com
```

### 2. Create the instance

```bash
gcloud redis instances create nd6-backplane \
    --size=1 \
    --region=europe-west1 \
    --redis-version=redis_7_0 \
    --network=default \
    --tier=basic \
    --async
```

> Takes ~3–5 minutes. Remove `--async` if you want to wait at the prompt.

### 3. Wait until READY

```bash
gcloud redis instances describe nd6-backplane \
    --region=europe-west1 \
    --format='value(state)'
```

Repeat until it returns `READY`.

### 4. Get the private IP

```bash
VALKEY_IP=$(gcloud redis instances describe nd6-backplane \
    --region=europe-west1 \
    --format='value(host)')
echo "Valkey IP: ${VALKEY_IP}"
```

### 5. Update Cloud Run

```bash
gcloud run services update nd6-app \
    --region europe-west1 \
    --update-env-vars "VALKEY_HOST=${VALKEY_IP},VALKEY_PORT=6379,VALKEY_ENABLED=true"
```

The service will redeploy automatically. Watch logs:

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=nd6-app" \
    --limit=20 --format='value(jsonPayload.message)' --freshness=5m
```

You should see:
```
[Valkey] Connected to redis://10.x.x.x:6379
[Valkey] Socket.IO Pub/Sub adapter attached.
```

---

## Option B — Memorystore for Valkey (newer product, PSC-based)

Memorystore for Valkey uses Private Service Connect (PSC). It is more complex
to set up because you need to reserve a static internal IP and create a
forwarding rule manually.

> **Recommendation:** use Option A for now. Migrate to Valkey PSC once GCP
> makes the gcloud CLI flow more streamlined (currently still in preview/alpha
> in some regions).

If you still want Valkey specifically:

```bash
# 1. Enable API
gcloud services enable memorystore.googleapis.com

# 2. Reserve an internal IP for the PSC endpoint
gcloud compute addresses create nd6-backplane-ip \
    --region=europe-west1 \
    --subnet=default \
    --addresses=10.132.0.100   # pick a free IP in your subnet range

# 3. Create the Valkey instance (alpha/beta CLI required)
gcloud alpha memorystore instances create nd6-backplane \
    --location=europe-west1 \
    --memory-size-gb=1 \
    --network=projects/mylittleproject00/global/networks/default \
    --async

# 4. Get the PSC service attachment URI
SA=$(gcloud alpha memorystore instances describe nd6-backplane \
    --location=europe-west1 \
    --format='value(pscServiceAttachments[0].serviceAttachment)')

# 5. Create the forwarding rule (PSC endpoint)
gcloud compute forwarding-rules create nd6-backplane-psc \
    --region=europe-west1 \
    --network=default \
    --address=nd6-backplane-ip \
    --target-service-attachment=${SA} \
    --load-balancing-scheme=""

# 6. The IP you reserved (10.132.0.100) is now your VALKEY_HOST
gcloud run services update nd6-app \
    --region europe-west1 \
    --update-env-vars "VALKEY_HOST=10.132.0.100,VALKEY_PORT=6379,VALKEY_ENABLED=true"
```

> [!WARNING]
> The alpha CLI commands above may change. Always run
> `gcloud alpha memorystore instances create --help` to verify flags.

---

## Undoing / Disabling Valkey

To revert to single-instance mode without deleting Memorystore:

```bash
gcloud run services update nd6-app \
    --region europe-west1 \
    --update-env-vars "VALKEY_ENABLED=false"
```

To delete the Memorystore instance (stops billing):

```bash
# Option A
gcloud redis instances delete nd6-backplane --region=europe-west1

# Option B
gcloud alpha memorystore instances delete nd6-backplane --location=europe-west1
```

---

## Scaling up after Valkey is working

Once you confirm pub/sub sync works across two instances, raise `max-instances`:

```bash
gcloud run services update nd6-app \
    --region europe-west1 \
    --max-instances 3 \
    --min-instances 1
```

At this point you can also remove `--session-affinity` from future deploys
(it's not needed when state is replicated via Valkey).
