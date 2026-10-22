from pathlib import Path
import tempfile
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright
html=Path(__file__).resolve().parents[1]/'preview/TRY_ANATOMY_PRACTICAL.html'
with tempfile.TemporaryDirectory() as td:
 p=Path(td)/'test-pattern.png'
 im=Image.new('RGBA',(640,450),(249,249,249,255));d=ImageDraw.Draw(im);d.ellipse((140,90,500,370),fill=(72,105,120,255));im.save(p)
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  page=browser.new_page(viewport={'width':1280,'height':900})
  errors=[];page.on('pageerror',lambda e: errors.append(str(e)))
  page.set_content(html.read_text('utf-8'),wait_until='load')
  assert page.get_by_role('heading',name='Interactive anatomy practical').count()==1
  page.locator('#file').set_input_files(str(p))
  assert 'Educator studio' in page.locator('.toolbar').inner_text()
  assert page.locator('#picture img').count()==1
  page.locator('#picture').click(position={'x':260,'y':190})
  assert page.locator('button.letter').count()==1
  page.locator('[data-f="name"]').fill('Reviewed structure')
  page.locator('[data-f="location"]').fill('Reviewed region of the image')
  page.locator('[data-f="explanation"]').fill('The arrow points to a selected landmark.')
  page.locator('[data-f="nameDistractors"]').fill('Distractor one\nDistractor two')
  page.locator('[data-f="nameDistractors"]').dispatch_event('input')
  page.locator('#student').click()
  assert page.locator('button.letter').inner_text()=='A'
  assert page.locator('label.choice').count()==3
  page.locator('label.choice').filter(has_text='Reviewed structure').click()
  page.locator('#check').click()
  assert '✓ Correct' in page.locator('.feedback').inner_text()
  page.locator('[data-qt="location"]').click()
  assert 'anatomically located' in page.locator('.question').inner_text()
  page.locator('#showanswer').click()
  assert 'Reviewed region' in page.locator('.feedback').inner_text()
  page.locator('#theme').click()
  assert page.locator('html').get_attribute('class')=='dark'
  page.set_viewport_size({'width':390,'height':850})
  assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Horizontal overflow on mobile'
  assert not errors,errors
  print('BROWSER INTERACTION PASS: upload, image target, name, location, MCQ, tick, written reveal, dark theme, mobile no overflow.')
  browser.close()
