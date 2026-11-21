#!/usr/bin/env python3
"""Send a single Docker-save artifact to its forced, app-specific SSH gateway."""
import argparse,gzip,hashlib,json,re,subprocess,tarfile,tempfile

LIMIT=3*1024**3

def unpacked_layer_bytes(tar_path):
 total=0
 with tarfile.open(tar_path,'r:') as archive:
  manifest=json.load(archive.extractfile(archive.getmember('manifest.json')))
  for item in manifest:
   for name in item.get('Layers',[]):
    with archive.extractfile(archive.getmember(name)) as source:
     prefix=source.read(2);source.seek(0)
     reader=gzip.GzipFile(fileobj=source) if prefix==b'\x1f\x8b' else source
     while block:=reader.read(1024**2):
      total+=len(block)
      if total>LIMIT:raise ValueError('artifact_budget_invalid')
 return total

def main():
 p=argparse.ArgumentParser();p.add_argument('archive');p.add_argument('revision');p.add_argument('user');p.add_argument('host');a=p.parse_args()
 if not re.fullmatch('[0-9a-f]{40}',a.revision) or not re.fullmatch('deploy-[a-z0-9-]+',a.user) or not re.fullmatch('[a-zA-Z0-9.-]+',a.host):raise ValueError('invalid_scope')
 digest=hashlib.sha256();size=0
 with tempfile.NamedTemporaryFile(prefix='release-image-',suffix='.tar') as raw:
  with gzip.open(a.archive,'rb') as source:
   while block:=source.read(1024**2):
    digest.update(block);size+=len(block)
    if size>LIMIT:raise ValueError('artifact_budget_invalid')
    raw.write(block)
  raw.flush()
  unpacked=max(size,unpacked_layer_bytes(raw.name))
  if not 0<size<=LIMIT or not 0<unpacked<=LIMIT:raise ValueError('artifact_budget_invalid')
  header={'version':1,'operation':'promote','revision':a.revision,'archiveBytes':size,'archiveSha256':digest.hexdigest(),'unpackedBudget':unpacked}
  raw.seek(0)
  with subprocess.Popen(['ssh','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ServerAliveInterval=15','-o','ServerAliveCountMax=3',a.user+'@'+a.host],stdin=subprocess.PIPE) as child:
   try:
    child.stdin.write(json.dumps(header).encode()+b'\n')
    while block:=raw.read(1024**2):child.stdin.write(block)
    child.stdin.close();result=child.wait(timeout=3600)
   except BaseException:
    child.kill();child.wait();raise
 if result:raise ValueError('promotion_failed')
if __name__=='__main__':
 try:main()
 except BaseException:
  print(json.dumps({'status':'failed','error':'image_transport_failed_output_suppressed'}));raise SystemExit(1)
