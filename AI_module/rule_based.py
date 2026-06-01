# rule_based.py

def apply_rules(result):

    gender        = result['gender']
    age_group     = result['age_group']
    clothing_type = result['clothing_type']

    # Rule 1 — Priority by age group
    if age_group in ['Girl', 'Elderly']:
        priority = 'High'
    else:
        priority = 'Medium'

    # Rule 2 — Other items low priority
    if clothing_type == 'Other':
        priority = 'Low'

    # Rule 3 — Distribution pool
    if gender == 'Unisex':
        pool = 'General pool'
    elif gender == 'Female':
        pool = 'Female pool'
    else:
        pool = 'Male pool'

    # Rule 4 — Donation tag
    donation_tag = f"{age_group} {gender} {clothing_type}"

    result['priority']     = priority
    result['pool']         = pool
    result['donation_tag'] = donation_tag

    return result