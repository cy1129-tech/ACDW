# heuristic.py

def recommend(inventory, region_needs):

    recommendations = []

    for region, needs in region_needs.items():
        for label, needed in needs.items():
            available = inventory.get(label, 0)
            shortage  = needed - available

            if shortage > 0:
                recommendations.append({
                    'region':   region,
                    'label':    label,
                    'action':   'SEND',
                    'quantity': min(available, needed),
                    'reason':   f'Shortage of {shortage} in {region}'
                })
            elif available > needed * 2:
                recommendations.append({
                    'region':   region,
                    'label':    label,
                    'action':   'REDISTRIBUTE',
                    'quantity': available - needed,
                    'reason':   f'Overstock in {region}'
                })

    # Shortages first
    recommendations.sort(
        key=lambda x: 0 if x['action'] == 'SEND' else 1
    )

    return recommendations