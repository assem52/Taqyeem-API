# Deploy smoke checklist

1. `GET /health` → 200  
2. Admin login via bootstrap account  
3. Launch → questions → publish → invite (copy link if email simulated)  
4. Learner register → verify → accept invite → attempt → results  
5. Admin follow-up + CSV export with Bearer  
6. Prod: `x-student-id` without JWT → 401  
7. Prod: `/ingestion` without admin → 401/403  
8. Multi-replica: only one instance with `CRON_ENABLED` unset/true  
