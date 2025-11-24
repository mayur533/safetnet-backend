#!/bin/bash

# Comprehensive API Test Script
echo "=== Testing All APIs ==="
echo ""

# Get tokens
echo "1. Getting authentication tokens..."
TOKEN_FREE=$(curl -s http://localhost:8000/api/users/login/ -X POST -H "Content-Type: application/json" -d '{"email":"freeuser@example.com","password":"testpass123!"}' | python3 -c "import sys, json; print(json.load(sys.stdin)['tokens']['access'])" 2>/dev/null)
TOKEN_PREMIUM=$(curl -s http://localhost:8000/api/users/login/ -X POST -H "Content-Type: application/json" -d '{"email":"premiumuser@example.com","password":"testpass123!"}' | python3 -c "import sys, json; print(json.load(sys.stdin)['tokens']['access'])" 2>/dev/null)
USER_ID_FREE=$(curl -s http://localhost:8000/api/users/login/ -X POST -H "Content-Type: application/json" -d '{"email":"freeuser@example.com","password":"testpass123!"}' | python3 -c "import sys, json; print(json.load(sys.stdin)['user']['id'])" 2>/dev/null)
USER_ID_PREMIUM=$(curl -s http://localhost:8000/api/users/login/ -X POST -H "Content-Type: application/json" -d '{"email":"premiumuser@example.com","password":"testpass123!"}' | python3 -c "import sys, json; print(json.load(sys.stdin)['user']['id'])" 2>/dev/null)

echo "✓ Tokens obtained"
echo ""

# Test Free User APIs
echo "=== FREE USER APIs ==="
echo "2. Get Profile (Free):"
curl -s http://localhost:8000/api/users/profile/ -H "Authorization: Bearer $TOKEN_FREE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(f\"  Plan: {d.get('plantype', 'N/A')}, Premium: {d.get('is_premium', False)}\")"

echo "3. Get Family Contacts (Free):"
curl -s http://localhost:8000/api/users/$USER_ID_FREE/family_contacts/ -H "Authorization: Bearer $TOKEN_FREE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(f\"  {len(d)} contacts\")"

echo "4. Get SOS Events (Free):"
curl -s http://localhost:8000/api/users/$USER_ID_FREE/sos_events/ -H "Authorization: Bearer $TOKEN_FREE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(f\"  {len(d.get('events', []))} events, Limit: {d.get('limit', 'N/A')}\")"

echo "5. Safety Tips (Free):"
curl -s http://localhost:8000/api/users/safety_tips/ | python3 -c "import sys, json; d=json.load(sys.stdin); print(f\"  {len(d.get('tips', []))} tips\")"

echo "6. Nearby Help (Free):"
curl -s "http://localhost:8000/api/users/nearby_help/?latitude=40.7128&longitude=-74.0060" | python3 -c "import sys, json; d=json.load(sys.stdin); print(f\"  {len(d.get('places', []))} places\")"

echo ""
echo "=== PREMIUM USER APIs ==="
echo "7. Get Profile (Premium):"
curl -s http://localhost:8000/api/users/profile/ -H "Authorization: Bearer $TOKEN_PREMIUM" | python3 -c "import sys, json; d=json.load(sys.stdin); print(f\"  Plan: {d.get('plantype', 'N/A')}, Premium: {d.get('is_premium', False)}, Price: \${d.get('plan_details', {}).get('price', 0)}\")"

echo "8. Get Geofences (Premium):"
curl -s http://localhost:8000/api/users/$USER_ID_PREMIUM/geofences/ -H "Authorization: Bearer $TOKEN_PREMIUM" | python3 -c "import sys, json; d=json.load(sys.stdin); print(f\"  {len(d.get('geofences', []))} geofences\")"

echo "9. Trusted Circle (Premium):"
curl -s http://localhost:8000/api/users/$USER_ID_PREMIUM/trusted_circle/ -H "Authorization: Bearer $TOKEN_PREMIUM" | python3 -c "import sys, json; d=json.load(sys.stdin); print(f\"  {len(d.get('members', []))} members\")"

echo "10. Custom Alerts (Premium):"
curl -s http://localhost:8000/api/users/$USER_ID_PREMIUM/custom_alerts/ -H "Authorization: Bearer $TOKEN_PREMIUM" | python3 -c "import sys, json; d=json.load(sys.stdin); print(f\"  {len(d.get('messages', []))} messages\")"

echo "11. Emergency Response (Premium):"
curl -s http://localhost:8000/api/users/$USER_ID_PREMIUM/emergency_response/ -X POST -H "Authorization: Bearer $TOKEN_PREMIUM" -H "Content-Type: application/json" -d '{"location":{"latitude":40.7128,"longitude":-74.0060},"message":"Test"}' | python3 -c "import sys, json; d=json.load(sys.stdin); print(f\"  Status: {d.get('status', 'N/A')}\")"

echo ""
echo "=== API Testing Complete ==="



