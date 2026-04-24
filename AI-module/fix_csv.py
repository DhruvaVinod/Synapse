import pandas as pd

# Load your existing dataset
df = pd.read_csv('volunteers.csv')

# Dictionary mapping your old CSV skills to the strict 7 AI categories
skill_mapping = {
    'medical_aid': 'medical',
    'first_aid': 'medical',
    'counselling': 'medical',
    'teaching': 'education',
    'food_distribution': 'food',
    'sanitation': 'hygiene',
    'logistics': 'disaster relief',
    'rescue': 'disaster relief',
    'elderly_care': 'elderly support',
    'shelter_construction': 'shelter'
}

# Function to translate old comma-separated strings to the new format
def map_skills(skill_string):
    if not isinstance(skill_string, str):
        return ''
    
    old_skills = [s.strip() for s in skill_string.split(',')]
    new_skills = set()
    
    for os in old_skills:
        if os in skill_mapping:
            new_skills.add(skill_mapping[os])
        elif os in skill_mapping.values():
            new_skills.add(os)
            
    return ','.join(list(new_skills))

# Apply the mapping and overwrite the CSV
df['skills'] = df['skills'].apply(map_skills)
df.to_csv('volunteers.csv', index=False)

print("✅ volunteers.csv has been successfully updated to match the 7 AI categories!")