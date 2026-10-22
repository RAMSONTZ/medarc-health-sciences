"""Production-browser acceptance test for a RUNNING MedArc Next.js server.

    npm install --no-audit --no-fund
    npm run build && npm run start
    python scripts/smoke_browser.py http://localhost:3000

Checks HTTP responses, horizontal overflow, question feedback, exam navigation,
profile personalization, search, and persistence on desktop / tablet / mobile.
No results are claimed until this script successfully runs against a live server.
"""
import os
import asyncio
import json
import sys
from pathlib import Path
from playwright.async_api import async_playwright

BASE=(sys.argv[1] if len(sys.argv)>1 else 'http://localhost:3000').rstrip('/')
ROUTES=['/','/topics','/practice','/answers','/exams','/anatomy','/review','/visual-learning','/group-exams']
VIEWPORTS=[{'width':390,'height':844}, {'width':768,'height':1024}, {'width':1440,'height':960}]

async def assert_route(page, route):
    response=await page.goto(BASE+route,wait_until='domcontentloaded',timeout=60000)
    assert response and response.status==200, (route, response.status if response else 'no response')
    assert await page.title(),f'Missing document title on {route}'
    await page.wait_for_timeout(200)
    overflow=await page.evaluate('document.documentElement.scrollWidth-window.innerWidth')
    assert overflow<=2,(route,'horizontal overflow',overflow)
    heading=page.locator('h1').first
    assert await heading.count(),f'Missing page heading {route}'

async def check_uploaded_visuals(page):
    await page.goto(BASE,wait_until='domcontentloaded')
    pathways=page.locator('.medarc-learning-route')
    assert await pathways.count()==7,'Homepage must include group examinations alongside the six learning pathways'
    hero_image=pathways.first.locator('img')
    await hero_image.scroll_into_view_if_needed()
    await hero_image.evaluate('(img) => img.decode()')
    assert await hero_image.evaluate('(img) => img.naturalWidth>0'),'Homepage student asset not loaded'
    scenes=page.locator('.medarc-study-scene')
    assert await scenes.count()>=6,'Homepage missing illustrated clinical scenes'
    await page.goto(BASE+'/visual-learning',wait_until='domcontentloaded')
    gallery=page.locator('.visual-lesson-card')
    assert await gallery.count()==20,'Full study gallery does not display 20 assets'
    first=gallery.first.locator('img')
    await first.scroll_into_view_if_needed()
    await first.evaluate('(img) => img.decode()')
    assert await first.evaluate('(img) => img.naturalWidth>0'),'Visual gallery asset not loaded'

async def check_search(page):
    await page.goto(BASE,wait_until='domcontentloaded')
    if page.viewport_size['width']<=720:
        await page.get_by_role('button',name='Search MedArc').click()
        search=page.locator('.mobile-search-popover input[type=search]')
    else:
        search=page.locator('.topbar > .smart-search input[type=search]')
    await search.fill('Shock')
    await search.press('Enter')
    await page.wait_for_url('**/practice?q=Shock',timeout=30000)
    assert '/practice?q=Shock' in page.url,'Search did not navigate to question practice'
    assert await page.locator('h1').count(),'Search results missing heading'

async def check_exam(page):
    await page.goto(BASE+'/exams',wait_until='domcontentloaded')
    first=page.locator('.exam-card').first
    assert await first.count(),'Exam-card list is empty'
    await first.click()
    await page.wait_for_url('**/exams/**',timeout=30000)
    assert await page.locator('.exam-detail').count(),'Exam detail did not open'
    assert await page.locator('.question-card').count(),'Exam missing question card'
    next_link=page.get_by_role('link',name='Next question')
    if await next_link.count():
        await next_link.click()
        await page.wait_for_function("new URL(window.location.href).searchParams.get('question') === '2'",timeout=30000)
        assert 'question=2' in page.url,'Exam navigation did not advance'

async def check_answers(page):
    await page.goto(BASE+'/answers',wait_until='domcontentloaded')
    card=page.locator('.question-card').first
    assert await card.count(),'Missing answered question'
    inputs=card.locator('.answer-option input')
    if await inputs.count():
        await inputs.first.check()
        submit=card.get_by_role('button',name='Check selected answers')
        if await submit.count():await submit.click()
        assert await card.locator('.answer-feedback').count(),'Missing answer feedback'
        answer_text=await card.locator('.answer-feedback').inner_text()
        assert 'PREPARED ANSWER' in answer_text or 'prepared answer' in answer_text.lower(),answer_text[:180]
    else:
        await card.get_by_role('button',name='Reveal model answer').click()
        assert await card.locator('.answer-feedback').count(),'Missing model answer'
    key='medarc:v2:attempts:v3'
    saved=await page.evaluate('(k)=>localStorage.getItem(k)',key)
    assert saved and json.loads(saved),'Answer was not persisted to the isolated attempt store'
    await page.reload(wait_until='domcontentloaded')
    card=page.locator('.question-card').first
    assert await card.count(),'Answer missing after reload'
    if await card.locator('.answer-option input').count():
        assert await card.locator('.answer-option input:checked').count(),'Saved answer did not rehydrate'

async def check_profile(page):
    await page.goto(BASE,wait_until='domcontentloaded')
    await page.locator('.profile-chip').click()
    modal=page.get_by_role('dialog',name='Personalize your experience')
    assert await modal.count(),'Profile wizard did not open'
    await modal.get_by_role('button',name='Professional').click()
    await modal.get_by_label('Display name (optional)').fill('QA Learner')
    await modal.get_by_role('button',name='Continue').click()
    focus=modal.get_by_role('button',name='Heart Failure')
    assert await focus.count(),'Study-interest chips missing'
    await focus.click()
    await modal.get_by_role('button',name='Save preferences').click()
    saved=await page.evaluate("localStorage.getItem('medarc:v2:profile')")
    assert saved,'Profile was not persisted'
    profile=json.loads(saved)
    assert profile['name']=='QA Learner' and profile['role']=='Professional' and 'Heart Failure' in profile['focus'],profile
    assert await page.locator('.profile-label').text_content()=='QA Learner','Profile UI not refreshed'

async def check_mobile_nav(page):
    await page.goto(BASE,wait_until='domcontentloaded')
    tabs=page.locator('.mobile-tabs')
    assert await tabs.is_visible(),'Mobile tabs should be visible at 390px'
    await tabs.locator('a[href="/practice"]').click()
    await page.wait_for_url('**/practice',timeout=30000)
    assert '/practice' in page.url,'Mobile navigation did not open Practice'
    await page.get_by_role('button',name='Open navigation').click()
    assert await page.locator('.sidebar.sidebar-open').count(),'Mobile drawer did not open'
    await page.get_by_role('button',name='Close menu').click()
    assert await page.locator('.sidebar.sidebar-open').count()==0,'Mobile drawer did not close'

async def main():
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True, executable_path=os.environ.get("CHROMIUM_EXECUTABLE"))
        errors=[]
        for viewport in VIEWPORTS:
            context=await browser.new_context(viewport=viewport)
            page=await context.new_page()
            page.on('pageerror',lambda error:errors.append(str(error)))
            for route in ROUTES:
                await assert_route(page,route)
                print('PASS',viewport['width'],route)
            await check_uploaded_visuals(page)
            await check_search(page)
            await check_exam(page)
            await check_answers(page)
            await check_profile(page)
            if viewport['width']==390:await check_mobile_nav(page)
            await context.close()
        await browser.close()
        assert not errors, 'Uncaught browser exceptions: '+repr(errors[:8])
        print('PASS: all routes + question feedback + persistence + search + exams + profile + mobile nav + overflow')

if __name__=='__main__':
    asyncio.run(main())
