import importlib.util
import tempfile
import unittest
from pathlib import Path
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
def load(name,path):
 s=importlib.util.spec_from_file_location(name,path)
 mod=importlib.util.module_from_spec(s);s.loader.exec_module(mod);return mod
IMPORT=load('medarc_anatomy_importer',ROOT/'scripts/import-anatomy-images.py')
MATTE=load('medarc_anatomy_matte',ROOT/'scripts/prepare-transparent-anatomy.py')

class ImagePipelineTest(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name)
  (self.root/'images').mkdir();(self.root/'permission-evidence').mkdir()
  (self.root/'permission-evidence/permission.txt').write_text('Authorized test fixture; not a real anatomy publication license.')
  image=Image.new('RGB',(250,250),'white');d=ImageDraw.Draw(image);d.ellipse((65,65,180,180),fill=(50,75,100))
  image.save(self.root/'images/test.png')
  self.data={'id':'test-anatomy','filename':'test.png','title':'Test specimen photo','topic':'Example body region','alt':'Test specimen against white background','credit':'Testing author','license':'Test fixture only',
   'rights':{'publication_authorized':True,'ai_processing_authorized':True,'copyright_owner_or_agent_confirmed':True,'attribution_confirmed':True,'patient_privacy_cleared':True,'evidence_file':'permission.txt'},
   'markers':[{'x':31,'y':37,'label':'Teacher checked structure','nameDistractors':['Alternative 1','Alternative 2'],'content_reviewed':True,'reviewer_name':'Fixture author'}]}
 def tearDown(self):self.temp.cleanup()
 def test_licensed_reviewed_marker_allowed(self):
  original,suffix=IMPORT.validate_record(self.data,self.root)
  self.assertEqual(suffix,'.png');self.assertTrue(original.exists())
 def test_rejects_public_mcq_without_review(self):
  self.data['markers'][0]['content_reviewed']=False
  with self.assertRaises(ValueError):IMPORT.validate_record(self.data,self.root)
 def test_rejects_duplicate_distractor_as_correct(self):
  self.data['markers'][0]['nameDistractors']=['Teacher checked structure','Alternative 2']
  with self.assertRaises(ValueError):IMPORT.validate_record(self.data,self.root)
 def test_transparency_preview_keeps_source_original(self):
  inp=self.root/'images/test.png';output=self.root/'preview.png'
  before=inp.read_bytes();result=MATTE.make_preview(inp,output)
  self.assertEqual(before,inp.read_bytes());self.assertEqual(result['status'],'PREVIEW_ONLY_MANUAL_QA_REQUIRED')
  result_im=Image.open(output).convert('RGBA')
  self.assertEqual(result_im.getpixel((0,0))[3],0)
  self.assertEqual(result_im.getpixel((100,100))[3],255)
if __name__=='__main__':unittest.main()
