import os
import re
import glob

# Normalize text by stripping city names and landmarks, focusing ONLY on the generated custom blocks
def normalize_text(text):
    # Extract only the local elements:
    # 1. Intro block
    intro_match = re.search(r'<!-- START_LOCAL_INTRO -->(.*?)<!-- END_LOCAL_INTRO -->', text, re.DOTALL)
    # 2. Prose block
    prose_match = re.search(r'<!-- START_LOCAL_PROSE -->(.*?)<!-- END_LOCAL_PROSE -->', text, re.DOTALL)
    # 3. FAQ 1 details
    faq1_match = re.search(r'<!-- START_LOCAL_FAQ1 -->(.*?)<!-- END_LOCAL_FAQ1 -->', text, re.DOTALL)
    # 4. FAQ 2 details
    faq2_match = re.search(r'<!-- START_LOCAL_FAQ2 -->(.*?)<!-- END_LOCAL_FAQ2 -->', text, re.DOTALL)
    
    extracted_parts = []
    if intro_match:
        extracted_parts.append(intro_match.group(1))
    if prose_match:
        extracted_parts.append(prose_match.group(1))
    if faq1_match:
        extracted_parts.append(faq1_match.group(1))
    if faq2_match:
        extracted_parts.append(faq2_match.group(1))
        
    if not extracted_parts:
        # If no custom blocks are found (e.g. it's a page that wasn't modified in the pilot),
        # return empty set so it doesn't trigger false positives.
        return set()
        
    local_text = " ".join(extracted_parts).lower()
    
    # Strip HTML tags
    local_text = re.sub(r'<[^>]+>', ' ', local_text)
    
    # List of city names, counties, and landmarks to normalize
    normalization_terms = [
        "port st. lucie", "port saint lucie", "stuart", "fort pierce", "ft. pierce",
        "jupiter", "palm city", "jensen-beach", "jensen beach", "jenson beach",
        "palm beach gardens", "hobe sound", "north palm beach", "martin county",
        "st. lucie county", "saint lucie county", "saint lucie west", "st. lucie west",
        "florida", "fl", "treasure coast"
    ]
    # Landmarks
    landmarks = [
        "stuart riverwalk", "roosevelt bridge", "leighton park", "st. lucie river",
        "fort pierce inlet", "historic downtown", "jupiter inlet lighthouse",
        "dubois park", "pga national", "gardens mall", "port st. lucie botanical gardens",
        "clover park", "clover park stadium", "tradition", "indian river lagoon",
        "jenson beach park", "st. lucie inlet", "pga boulevard", "historic lincoln park",
        "cobblestone", "harbour ridge", "martin downs", "islesworth", "orchid bay",
        "all saints episcopal church", "pineapple festival", "jonathan dickinson state park",
        "port salerno", "okeechobee", "jack nicklaus", "john d. macarthur beach state park"
    ]
    # Replace all these with placeholders
    for term in normalization_terms:
        local_text = re.sub(r'\b' + re.escape(term) + r'\b', '[location]', local_text)
    for landmark in landmarks:
        local_text = re.sub(r'\b' + re.escape(landmark) + r'\b', '[landmark]', local_text)
    # Strip non-alphanumeric characters
    local_text = re.sub(r'[^a-z0-9\s\[\]]', ' ', local_text)
    # Tokenize
    words = set(local_text.split())
    return words

def compute_jaccard(words1, words2):
    if not words1 or not words2:
        return 0.0
    return len(words1.intersection(words2)) / len(words1.union(words2))

def main():
    site_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    html_files = glob.glob(os.path.join(site_dir, "**/index.html"), recursive=True)
        
    print(f"Verifying uniqueness for {len(html_files)} files...")
    
    # Load and normalize all files
    file_words = {}
    for filepath in html_files:
        rel_path = os.path.relpath(filepath, site_dir)
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        words = normalize_text(content)
        if words:  # Only check files that have custom blocks (the pilot pages)
            file_words[rel_path] = words
        
    # Check all pairs
    failures = 0
    checked_pairs = 0
    rel_paths = list(file_words.keys())
    print(f"Checking {len(rel_paths)} pilot files pairwise...")
    for i in range(len(rel_paths)):
        for j in range(i + 1, len(rel_paths)):
            path1 = rel_paths[i]
            path2 = rel_paths[j]
            sim = compute_jaccard(file_words[path1], file_words[path2])
            checked_pairs += 1
            if sim > 0.85:
                print(f"❌ Uniqueness Failure: {path1} and {path2} have Jaccard similarity of {sim:.2%}")
                failures += 1
                
    print(f"Checked {checked_pairs} pairs.")
    if failures > 0:
        print(f"Uniqueness check failed with {failures} duplicate pairs!")
        exit(1)
    else:
        print("✅ All pages are sufficiently unique (under 85% similarity threshold).")

if __name__ == "__main__":
    main()
