#!/usr/bin/env python3
"""Runs firestore.rules through the Firebase Rules API test endpoint with mocked member documents."""
import json,urllib.request,os,sys
tok=json.load(open(os.path.expanduser('~/.config/configstore/firebase-tools.json')))['tokens']['access_token']
src=open('firestore.rules').read()
DB='/databases/(default)/documents'
ORG=f'{DB}/organisations/tanthof'
def mock_member(uid, roles):
    return {"function":"get","args":[{"exact_value":f"{ORG}/members/{uid}"}],"result":{"value":{"data":{"uid":uid,"roles":roles}}}}
def mock_exists(path, v=True):
    return {"function":"exists","args":[{"exact_value":path}],"result":{"value":v}}
T='2026-10-11T10:00:00Z'
def case(exp, uid, roles, method, path, data=None, existing=None, extra=None):
    req={"auth":{"uid":uid},"path":path,"method":method,"time":T}
    if data is not None: req["resource"]={"data":data}
    c={"expectation":exp,"request":req,"functionMocks":[mock_member(uid,roles)]+(extra or [])}
    if existing is not None: c["resource"]={"data":existing}
    return c
TS={"__ts__":T}  # placeholder, replaced below
cases=[]
# items
cases.append(('item ok feed', case("ALLOW","u1",["feed"],"create",f"{ORG}/items/bin-a_hooi",{"storageId":"bin-a","feedId":"hooi","amount":3,"updatedAt":TS})))
cases.append(('item bad id', case("DENY","u1",["feed"],"create",f"{ORG}/items/bin-a_stro",{"storageId":"bin-a","feedId":"hooi","amount":3,"updatedAt":TS})))
cases.append(('item negative', case("DENY","u1",["feed"],"update",f"{ORG}/items/bin-a_hooi",{"storageId":"bin-a","feedId":"hooi","amount":-1,"updatedAt":TS},existing={"storageId":"bin-a","feedId":"hooi","amount":1,"updatedAt":TS})))
cases.append(('item view denied', case("DENY","u1",["view"],"create",f"{ORG}/items/bin-a_hooi",{"storageId":"bin-a","feedId":"hooi","amount":3,"updatedAt":TS})))
cases.append(('item view read', case("ALLOW","u1",["view"],"get",f"{ORG}/items/bin-a_hooi")))
# logs
log=lambda t,**k:{"type":t,"feedId":"hooi","storageId":"bin-a","amount":2,"uid":"u1","timestamp":TS,**k}
cases.append(('delivery by deliver', case("ALLOW","u1",["deliver"],"create",f"{ORG}/logs/l1",log("delivery",batchId="b1"))))
cases.append(('delivery by feed denied', case("DENY","u1",["feed"],"create",f"{ORG}/logs/l1",log("delivery"))))
cases.append(('count by feed', case("ALLOW","u1",["feed"],"create",f"{ORG}/logs/l1",log("count",previousAmount=5))))
cases.append(('count by deliver denied', case("DENY","u1",["deliver"],"create",f"{ORG}/logs/l1",log("count"))))
cases.append(('fill by deliver', case("ALLOW","u1",["deliver"],"create",f"{ORG}/logs/l1",log("fill"))))
cases.append(('fill by feed', case("ALLOW","u1",["feed"],"create",f"{ORG}/logs/l1",log("fill"))))
cases.append(('log by order denied', case("DENY","u1",["order"],"create",f"{ORG}/logs/l1",log("dispense"))))
cases.append(('log moveId key denied', case("DENY","u1",["admin"],"create",f"{ORG}/logs/l1",log("move",moveId="x"))))
cases.append(('log read order', case("ALLOW","u1",["order"],"get",f"{ORG}/logs/l1")))
cases.append(('log wrong uid', case("DENY","u1",["admin"],"create",f"{ORG}/logs/l1",{**log("dispense"),"uid":"u2"})))
# batches
cases.append(('batch delivery by deliver', case("ALLOW","u1",["deliver"],"create",f"{ORG}/batches/b1",{"type":"delivery","uid":"u1","startedAt":TS})))
cases.append(('batch delivery by feed denied', case("DENY","u1",["feed"],"create",f"{ORG}/batches/b1",{"type":"delivery","uid":"u1","startedAt":TS})))
cases.append(('batch close own', case("ALLOW","u1",["deliver"],"update",f"{ORG}/batches/b1",{"type":"delivery","uid":"u1","startedAt":TS,"closedAt":TS},existing={"type":"delivery","uid":"u1","startedAt":TS})))
cases.append(('batch close other denied', case("DENY","u1",["deliver"],"update",f"{ORG}/batches/b1",{"type":"delivery","uid":"u2","startedAt":TS,"closedAt":TS},existing={"type":"delivery","uid":"u2","startedAt":TS})))
# members
cases.append(('admin adds feed member', case("ALLOW","u1",["admin"],"create",f"{ORG}/members/u9",{"uid":"u9","roles":["feed","deliver"],"createdAt":TS})))
cases.append(('admin adds admin denied', case("DENY","u1",["admin"],"create",f"{ORG}/members/u9",{"uid":"u9","roles":["admin"],"createdAt":TS})))
cases.append(('owner adds admin', case("ALLOW","u1",["owner"],"create",f"{ORG}/members/u9",{"uid":"u9","roles":["admin"],"createdAt":TS})))
cases.append(('bad role', case("DENY","u1",["owner"],"create",f"{ORG}/members/u9",{"uid":"u9","roles":["boss"],"createdAt":TS})))
cases.append(('empty roles', case("DENY","u1",["owner"],"create",f"{ORG}/members/u9",{"uid":"u9","roles":[],"createdAt":TS})))
cases.append(('owner self demote denied', case("DENY","u1",["owner"],"update",f"{ORG}/members/u1",{"uid":"u1","roles":["admin"],"createdAt":TS},existing={"uid":"u1","roles":["owner"],"createdAt":TS})))
cases.append(('admin edits admin denied', case("DENY","u1",["admin"],"update",f"{ORG}/members/u2",{"uid":"u2","roles":["admin","feed"],"createdAt":TS},existing={"uid":"u2","roles":["admin"],"createdAt":TS})))
cases.append(('self email', case("ALLOW","u1",["view"],"update",f"{ORG}/members/u1",{"uid":"u1","roles":["view"],"email":"a@b.c","createdAt":TS},existing={"uid":"u1","roles":["view"],"createdAt":TS})))
cases.append(('self roles denied', case("DENY","u1",["view"],"update",f"{ORG}/members/u1",{"uid":"u1","roles":["admin"],"createdAt":TS},existing={"uid":"u1","roles":["view"],"createdAt":TS})))
cases.append(('delete owner denied', case("DENY","u1",["owner"],"delete",f"{ORG}/members/u2",existing={"uid":"u2","roles":["owner"],"createdAt":TS})))
# storages
cases.append(('storage with location', case("ALLOW","u1",["deliver"],"create",f"{ORG}/storages/bin-b",{"groupId":"ungrouped","typeId":"bin","name":"B","status":"active","order":1,"location":{"__latlng__":1}},extra=[mock_exists(f"{ORG}/storageGroups/ungrouped"),mock_exists(f"{ORG}/storageTypes/bin")])))
cases.append(('storage bad id', case("DENY","u1",["deliver"],"create",f"{ORG}/storages/Bin_B",{"groupId":"ungrouped","typeId":"bin","name":"B","status":"active","order":1},extra=[mock_exists(f"{ORG}/storageGroups/ungrouped"),mock_exists(f"{ORG}/storageTypes/bin")])))
# feeds
cases.append(('feed aliases', case("ALLOW","u1",["deliver"],"create",f"{ORG}/feeds/grasbrok",{"name":"Grasbrok","unit":"zak","aliases":["Grasbrokjes"],"hidden":False,"order":1})))
cases.append(('item updatedAt not ts', case("DENY","u1",["feed"],"create",f"{ORG}/items/bin-a_hooi",{"storageId":"bin-a","feedId":"hooi","amount":3,"updatedAt":"notadate"})))
cases.append(('log future', case("DENY","u1",["feed"],"create",f"{ORG}/logs/l1",{**log("dispense"),"timestamp":"2026-10-11T11:00:00Z"})))
cases.append(('log backdated', case("ALLOW","u1",["feed"],"create",f"{ORG}/logs/l1",{**log("dispense"),"timestamp":"2026-10-09T11:00:00Z"})))
# non-member
c=case("DENY","u1",["feed"],"get",f"{ORG}/feeds/grasbrok"); c["functionMocks"]=[{"function":"get","args":[{"exact_value":f"{ORG}/members/u1"}],"result":{"undefined":{}}}]
cases.append(('non-member', c))

tsfmt=sys.argv[1] if len(sys.argv)>1 else 'string'
def conv(o):
    if isinstance(o,dict):
        if "__ts__" in o:
            return {"string":T,"obj":{"timestamp":T},"obj2":{"__type__":"timestamp","value":T},"obj3":{"seconds":1760176800,"nanos":0}}[tsfmt] if tsfmt!="string" else T
        if "__latlng__" in o:
            return {"latitude":1.0,"longitude":2.0}
        return {k:conv(v) for k,v in o.items()}
    if isinstance(o,list): return [conv(v) for v in o]
    return o
body=json.dumps({"source":{"files":[{"name":"firestore.rules","content":src}]},"testSuite":{"testCases":[conv(c) for _,c in cases]}}).encode()
req=urllib.request.Request('https://firebaserules.googleapis.com/v1/projects/bonafarm-next:test',data=body,headers={'Authorization':'Bearer '+tok,'Content-Type':'application/json'})
try:
  res=json.load(urllib.request.urlopen(req))
except urllib.error.HTTPError as e:
  print('HTTP',e.code,e.read().decode()[:2000]); sys.exit(1)
fails=0
for (name,c),r in zip(cases,res.get('testResults',[])):
    ok=r.get('state')=='SUCCESS'
    if not ok:
        fails+=1
        print('FAIL',name,'expected',c['expectation'],'|',[m for m in r.get('debugMessages',[])][:3],r.get('errorPosition'))
print(f'{len(cases)-fails}/{len(cases)} passed (ts format {tsfmt})')
