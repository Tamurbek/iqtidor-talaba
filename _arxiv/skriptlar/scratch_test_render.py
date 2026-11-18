import os
import jinja2

template_dir = 'app/templates'
env = jinja2.Environment(loader=jinja2.FileSystemLoader(template_dir))

# Mock minimal context
class DummyUser:
    id = 1
    hemis_id = "jbnuu-admin"
    full_name = "Administrator Olimjon o'g'li"
    role = "admin"
    role_names = ["Super Administrator"]
    faculty = "Boshqaruv"
    direction = "IT"
    group_name = None
    course = None
    avg_gpa = 5.0
    is_active = True

mock_users = [DummyUser()]

try:
    template = env.get_template('admin_dashboard.html')
    rendered = template.render(
        user=DummyUser(),
        achievements=[],
        pending_count=0,
        approved_count=0,
        ranking=[],
        contest_applications=[],
        exam_results=[],
        all_roles=[],
        groups_list=[],
        news_list=[],
        all_users=mock_users,
        active_page="dashboard"
    )
    print("SUCCESS: Template rendered without error! Length:", len(rendered))
    
    # Check rendered onclick
    idx = rendered.find('openEditUserModal')
    print("Rendered onclick snippet:", rendered[idx:idx+120])
except Exception as e:
    import traceback
    traceback.print_exc()
