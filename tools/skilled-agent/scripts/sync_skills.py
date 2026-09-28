#!/usr/bin/env python3
"""Sync / verify the Agent Skills pack used by the agent.

  python3 scripts/sync_skills.py                 # copy from the iConnect repo's .agents (skills/ + references/)
  python3 scripts/sync_skills.py --from PATH     # copy from another .agents-style dir
  python3 scripts/sync_skills.py --github        # fetch latest from github.com/addyosmani/agent-skills
  python3 scripts/sync_skills.py --verify        # validate frontmatter + links, write skills-lock.json
"""
import argparse, hashlib, io, json, os, re, shutil, sys, urllib.request, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKILLS, REFS, LOCK = (os.path.join(ROOT, p) for p in ("skills", "references", "skills-lock.json"))
DEFAULT_SRC = os.path.join(ROOT, "..", "..", ".agents")  # when living inside iConnect/tools/

def frontmatter(md):
    m = re.match(r"^---\r?\n(.*?)\r?\n---", md, re.S); meta = {}
    if m:
        for line in m.group(1).splitlines():
            kv = re.match(r"^([\w-]+):\s*(.*)$", line)
            if kv: meta[kv.group(1)] = kv.group(2).strip().strip('"\'')
    return meta

def copy_tree(src, dst):
    if os.path.isdir(dst): shutil.rmtree(dst)
    shutil.copytree(src, dst)

def sync_local(src):
    s, r = os.path.join(src, "skills"), os.path.join(src, "references")
    if not os.path.isdir(s): sys.exit(f"no skills dir at {s}")
    copy_tree(s, SKILLS)
    if os.path.isdir(r): copy_tree(r, REFS)
    print(f"synced from {src}")

def sync_github(repo="addyosmani/agent-skills", ref="main"):
    url = f"https://github.com/{repo}/archive/refs/heads/{ref}.zip"; print(f"downloading {url} …")
    z = zipfile.ZipFile(io.BytesIO(urllib.request.urlopen(url, timeout=60).read()))
    top = z.namelist()[0].split("/")[0]; tmp = os.path.join(ROOT, ".tmp_skills")
    shutil.rmtree(tmp, ignore_errors=True); z.extractall(tmp); base = os.path.join(tmp, top)
    copy_tree(os.path.join(base, "skills"), SKILLS)
    if os.path.isdir(os.path.join(base, "references")): copy_tree(os.path.join(base, "references"), REFS)
    shutil.rmtree(tmp); print("synced from GitHub")

def verify():
    ok, lock = True, {"version": 1, "skills": {}}
    for name in sorted(os.listdir(SKILLS)):
        f = os.path.join(SKILLS, name, "SKILL.md")
        if not os.path.isfile(f): print(f"  ✖ {name}: missing SKILL.md"); ok = False; continue
        md = open(f, encoding="utf-8").read(); meta = frontmatter(md)
        if "name" not in meta or "description" not in meta: print(f"  ✖ {name}: frontmatter needs name + description"); ok = False; continue
        for link in re.findall(r"\.\./\.\./references/([\w.-]+\.md)", md):
            if not os.path.isfile(os.path.join(REFS, link)): print(f"  ✖ {name}: broken reference link {link}"); ok = False
        lock["skills"][name] = {"sha256": hashlib.sha256(md.encode()).hexdigest(), "description": meta["description"][:120]}
        print(f"  ✔ {name}")
    json.dump(lock, open(LOCK, "w"), indent=2)
    print(f"{len(lock['skills'])} skills, {len(os.listdir(REFS)) if os.path.isdir(REFS) else 0} references → skills-lock.json")
    return ok

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--from", dest="src", default=DEFAULT_SRC)
    ap.add_argument("--github", action="store_true"); ap.add_argument("--verify", action="store_true")
    a = ap.parse_args()
    if a.github: sync_github()
    elif not a.verify: sync_local(os.path.abspath(a.src))
    sys.exit(0 if verify() else 1)
