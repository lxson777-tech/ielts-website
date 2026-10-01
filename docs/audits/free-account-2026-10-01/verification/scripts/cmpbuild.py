import os, re, sys
a, b = sys.argv[1], sys.argv[2]
H = re.compile(r'\.[A-Za-z0-9_-]{8}\.(js|css)')
def norm(t): return H.sub(r'.H.\1', t)
def files(root):
    out = {}
    for d, _, fs in os.walk(root):
        for f in fs:
            p = os.path.join(d, f); rel = os.path.relpath(p, root).replace(os.sep, '/')
            out.setdefault(H.sub(r'.H.\1', rel), []).append(p)
    return out
fa, fb = files(a), files(b)
print("only mine", sorted(set(fa)-set(fb))[:10]); print("only review", sorted(set(fb)-set(fa))[:10])
diff = 0
for k in sorted(set(fa)&set(fb)):
    if len(fa[k])!=1 or len(fb[k])!=1: continue
    try:
        ta = open(fa[k][0], encoding='utf-8').read(); tb = open(fb[k][0], encoding='utf-8').read()
    except Exception: continue
    if norm(ta)!=norm(tb):
        diff += 1
        if diff<=8: print("DIFF", k)
print("text files differing after hash-normalising:", diff, "of", len(set(fa)&set(fb)))
