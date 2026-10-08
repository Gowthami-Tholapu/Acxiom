from datetime import date, datetime, timedelta, timezone
from sqlalchemy import select
from app.core.security import get_password_hash
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models.activity import Activity
from app.models.audit_log import AuditLog
from app.models.customer import Customer
from app.models.follow_up import FollowUp
from app.models.lead import Lead
from app.models.opportunity import Opportunity
from app.models.role import Role
from app.models.user import User


def seed_database():
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # 1. Seed Roles
        roles_dict = {}
        for role_name in ["Admin", "Manager", "SalesExecutive"]:
            role = db.scalar(select(Role).where(Role.name == role_name))
            if not role:
                role = Role(name=role_name)
                db.add(role)
                db.flush()
                print(f"Created role: {role_name}")
            roles_dict[role_name] = role

        # 2. Seed Users
        users_data = [
            ("Admin User", "admin@acxiomcrm.com", "Admin@12345!", "Admin"),
            ("Sales Manager", "manager@acxiomcrm.com", "Manager@12345!", "Manager"),
            ("Alex Morgan", "alex.sales@acxiomcrm.com", "Sales@12345!", "SalesExecutive"),
            ("Sarah Jenkins", "sarah.sales@acxiomcrm.com", "Sales@12345!", "SalesExecutive"),
        ]

        users_map = {}
        for name, email, pwd, role_title in users_data:
            user = db.scalar(select(User).where(User.email == email))
            if not user:
                user = User(
                    name=name,
                    email=email,
                    password_hash=get_password_hash(pwd),
                    role_id=roles_dict[role_title].id,
                    is_active=True,
                    failed_login_count=0,
                )
                db.add(user)
                db.flush()
                print(f"Created user: {email} ({role_title})")
            users_map[email] = user

        admin_user = users_map["admin@acxiomcrm.com"]
        alex = users_map["alex.sales@acxiomcrm.com"]
        sarah = users_map["sarah.sales@acxiomcrm.com"]

        # 3. Seed Customers
        customers_data = [
            ("CUST-0001", "Acme Corporation", "contact@acme.com", "+1-202-555-0101", "Acme Industries", "100 Market St", "San Francisco", "CA", "Active", alex.id),
            ("CUST-0002", "Globex Global", "info@globex.org", "+1-202-555-0102", "Globex Corp", "500 Madison Ave", "New York", "NY", "Active", alex.id),
            ("CUST-0003", "Stark Logistics", "support@starklogistics.io", "+1-202-555-0103", "Stark Enterprises", "10880 Malibu Point", "Malibu", "CA", "Active", sarah.id),
            ("CUST-0004", "Initech Solutions", "billing@initech.com", "+1-202-555-0104", "Initech LLC", "4120 Freemont Blvd", "Austin", "TX", "Active", sarah.id),
            ("CUST-0005", "Wayne Enterprise Tech", "bruce@wayneenterprises.net", "+1-202-555-0105", "Wayne Corp", "1007 Mountain Dr", "Gotham", "NJ", "Active", alex.id),
        ]

        customers_map = {}
        for code, cname, email, phone, comp, addr, city, state, st, creator_id in customers_data:
            cust = db.scalar(select(Customer).where(Customer.customer_code == code))
            if not cust:
                cust = Customer(
                    customer_code=code,
                    customer_name=cname,
                    email=email,
                    phone=phone,
                    company_name=comp,
                    address=addr,
                    city=city,
                    state=state,
                    status=st,
                    created_by=creator_id,
                )
                db.add(cust)
                db.flush()
                print(f"Created customer: {cname} ({code})")
            customers_map[code] = cust

        # 4. Seed Leads
        leads_data = [
            ("LEAD-0001", "David Miller", "david.m@cyberdyne.io", "+1-415-555-0111", "Cyberdyne Systems", "Website", "New", "High", 35000.0, alex.id),
            ("LEAD-0002", "Elena Rostova", "elena@novatech.com", "+1-415-555-0112", "Nova Tech", "Referral", "Contacted", "Medium", 22000.0, alex.id),
            ("LEAD-0003", "Marcus Vance", "marcus@vanceenterprises.com", "+1-415-555-0113", "Vance Corp", "Campaign", "Qualified", "Urgent", 65000.0, sarah.id),
            ("LEAD-0004", "Linda Wu", "linda@solarsolutions.co", "+1-415-555-0114", "Solar Solutions", "Trade Show", "Lost", "Low", 15000.0, sarah.id),
            ("LEAD-0005", "Robert Chen", "rchen@apexmanufacturing.com", "+1-415-555-0115", "Apex Manufacturing", "Cold Call", "New", "Medium", 18000.0, alex.id),
        ]

        leads_map = {}
        for lcode, lname, email, phone, cname, src, st, prio, val, owner_id in leads_data:
            lead = db.scalar(select(Lead).where(Lead.lead_code == lcode))
            if not lead:
                lead = Lead(
                    lead_code=lcode,
                    lead_name=lname,
                    email=email,
                    phone=phone,
                    company_name=cname,
                    source=src,
                    status=st,
                    priority=prio,
                    expected_value=val,
                    assigned_to=owner_id,
                )
                db.add(lead)
                db.flush()
                print(f"Created lead: {lname} ({lcode})")
            leads_map[lcode] = lead

        # 5. Seed Opportunities
        today = date.today()
        opps_data = [
            ("Enterprise CRM Migration", customers_map["CUST-0001"].id, 85000.0, "Negotiation", 75.0, today + timedelta(days=20), "Open", alex.id, "Late stage price negotiation"),
            ("Cloud Infrastructure Expansion", customers_map["CUST-0002"].id, 45000.0, "Proposal", 50.0, today + timedelta(days=35), "Open", alex.id, "Awaiting VP review"),
            ("Logistics Fleet Tracking Module", customers_map["CUST-0003"].id, 120000.0, "Won", 100.0, today - timedelta(days=5), "Won", sarah.id, "Contract signed"),
            ("HR Portal Integration", customers_map["CUST-0004"].id, 30000.0, "Qualification", 20.0, today + timedelta(days=45), "Open", sarah.id, "Initial discovery call completed"),
            ("Cybersecurity Defense Suite", customers_map["CUST-0005"].id, 150000.0, "Won", 100.0, today - timedelta(days=15), "Won", alex.id, "Annual license closed"),
        ]

        for name, cid, amt, stage, prob, cdate, st, owner_id, notes in opps_data:
            opp = db.scalar(select(Opportunity).where(Opportunity.opportunity_name == name))
            if not opp:
                opp = Opportunity(
                    opportunity_name=name,
                    customer_id=cid,
                    amount=amt,
                    stage=stage,
                    probability=prob,
                    expected_close_date=cdate,
                    status=st,
                    assigned_to=owner_id,
                    notes=notes,
                )
                db.add(opp)
                db.flush()
                print(f"Created opportunity: {name} (${amt})")

        # 6. Seed Follow-ups
        now = datetime.now()
        follow_ups_data = [
            (customers_map["CUST-0001"].id, None, now + timedelta(days=2, hours=3), "Meeting", "Discuss contract terms with legal", "Planned", alex.id),
            (customers_map["CUST-0002"].id, None, now + timedelta(days=4, hours=1), "Call", "Follow up on proposal review", "Planned", alex.id),
            (None, leads_map["LEAD-0003"].id, now + timedelta(days=1, hours=2), "Call", "Schedule product demo walkthrough", "Planned", sarah.id),
            (customers_map["CUST-0003"].id, None, now - timedelta(days=3), "Meeting", "Kickoff meeting for project onboarding", "Completed", sarah.id),
            (None, leads_map["LEAD-0001"].id, now + timedelta(days=5), "Email", "Send introductory capabilities whitepaper", "Planned", alex.id),
        ]

        for cid, lid, fdate, ftype, subj, st, owner_id in follow_ups_data:
            fu = db.scalar(select(FollowUp).where(FollowUp.subject == subj))
            if not fu:
                fu = FollowUp(
                    customer_id=cid,
                    lead_id=lid,
                    follow_up_date=fdate,
                    follow_up_type=ftype,
                    subject=subj,
                    status=st,
                    assigned_to=owner_id,
                )
                db.add(fu)
                db.flush()
                print(f"Created follow-up: {subj}")

        # 7. Seed Activities
        acts_data = [
            ("Call", "Initial requirements gathering call", "Discussed scope and timeline with CTO", now - timedelta(days=2), customers_map["CUST-0001"].id, None, alex.id),
            ("Meeting", "Discovery Workshop", "Conducted architecture discovery with engineering team", now - timedelta(days=4), customers_map["CUST-0002"].id, None, alex.id),
            ("Email", "Sent pricing proposal v1", "Shared formal commercial proposal with stakeholders", now - timedelta(days=1), customers_map["CUST-0003"].id, None, sarah.id),
            ("Task", "Prepare security compliance checklist", "Completed SOC2 compliance mapping", now - timedelta(hours=5), customers_map["CUST-0005"].id, None, alex.id),
        ]

        for atype, subj, desc_text, adate, cid, lid, owner_id in acts_data:
            act = db.scalar(select(Activity).where(Activity.subject == subj))
            if not act:
                act = Activity(
                    activity_type=atype,
                    subject=subj,
                    description=desc_text,
                    activity_date=adate,
                    customer_id=cid,
                    lead_id=lid,
                    status="Completed",
                    assigned_to=owner_id,
                )
                db.add(act)
                db.flush()
                print(f"Created activity: {subj}")

        # 8. Seed Audit Log entries
        audit_entries = [
            (admin_user.id, "LOGIN", "Auth", None, "Administrator system login"),
            (alex.id, "CREATE", "Customer", customers_map["CUST-0001"].id, "Created customer Acme Corporation"),
            (sarah.id, "CREATE", "Lead", leads_map["LEAD-0003"].id, "Captured inbound lead Marcus Vance"),
            (sarah.id, "UPDATE", "Opportunity", "3", "Marked Logistics Fleet Tracking Module as Won"),
        ]

        for uid, action, entity, rec_id, details in audit_entries:
            db.add(
                AuditLog(
                    user_id=uid,
                    action=action,
                    entity_name=entity,
                    record_id=str(rec_id) if rec_id else None,
                    details=details,
                    ip_address="127.0.0.1",
                )
            )

        db.commit()
        print("Database successfully seeded with comprehensive CRM test dataset!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
