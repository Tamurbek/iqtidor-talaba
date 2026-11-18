import urllib.request
import json

base = 'http://127.0.0.1:8000'
req = urllib.request.Request(base + '/api/v1/auth/login', data=json.dumps({'login':'admin','password':'admin123'}).encode(), headers={'Content-Type':'application/json'})
resp = urllib.request.urlopen(req)
c = resp.headers.get('Set-Cookie').split(';')[0]

req_admin = urllib.request.Request(base + '/admin', headers={'Cookie': c})
resp_admin = urllib.request.urlopen(req_admin)
html = resp_admin.read().decode('utf-8')

print('Tab users pos:', html.find('tab-content-users-management'))
print('Table pos:', html.find('adminUsersTable'))
print('User rows count:', html.count('class="user-row"'))
print('Tab profile pos:', html.find('tab-content-profile-security'))
print('Has myProfileFullName:', 'id="myProfileFullName"' in html)
