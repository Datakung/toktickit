from pathlib import Path
import json, re, html, hashlib
from datetime import datetime
from PIL import Image as PILImage
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Flowable, KeepTogether
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader, PdfWriter

ROOT = Path(__file__).resolve().parents[1]
EV = ROOT / 'artifacts/lab-04/final-main'
OUT = ROOT / 'output/pdf/TokTickIT-Lab4-Review.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
REV = '0f169eaeca9bf00672c5c32884a1913c53b845d3'
BASE = 'https://github.com/Datakung/toktickit'
manifest = json.loads((EV/'gate/manifest.json').read_text(encoding='utf-8-sig'))
parity = json.loads((EV/'dashboard-parity.json').read_text())
assert manifest['status'] == 'passed' and manifest['preservationVerified'] and not manifest['workingTreeDirtyAtStart']
assert manifest['revision'] == REV and parity['status'] == 'passed' and parity['preservationVerified']
index = json.loads((EV/'captured-screenshots.json').read_text(encoding='utf-8-sig'))
W,H = A4; AREA = W-72
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='Copy',fontName='Helvetica',fontSize=9.5,leading=12.5,spaceAfter=5,allowWidows=0,allowOrphans=0,textColor=colors.HexColor('#14332b')))
styles.add(ParagraphStyle(name='SmallCopy',parent=styles['Copy'],fontSize=9,leading=12,spaceAfter=5))
styles.add(ParagraphStyle(name='CellCopy',parent=styles['Copy'],fontSize=8.7,leading=11,spaceAfter=0,wordWrap=None))
styles.add(ParagraphStyle(name='PartTitle',fontName='Helvetica-Bold',fontSize=25,leading=30,spaceAfter=12,textColor=colors.HexColor('#006c46')))
styles.add(ParagraphStyle(name='SubTitle',fontName='Helvetica-Bold',fontSize=14,leading=18,spaceBefore=10,spaceAfter=7,keepWithNext=True,textColor=colors.HexColor('#006c46')))
styles.add(ParagraphStyle(name='CaptionCopy',parent=styles['SmallCopy'],fontSize=8.3,leading=11,textColor=colors.HexColor('#47615a')))
styles.add(ParagraphStyle(name='CodeCopy',parent=styles['SmallCopy'],fontName='Courier',fontSize=8.5,leading=11))
story=[]; figure_records=[]

def fmt(text):
    text = text.replace('→',' -> ').replace('–','-').replace('—','-').replace('≥','>=').replace('≤','<=')
    text = text.replace('✓','Pass').replace('×','Fail').replace('├','+').replace('└','+').replace('─','-').replace('│','|')
    text = html.escape(text)
    text = re.sub(r'\[([^\]]+)\]\((https?://[^)]+)\)',lambda m:f'<link href="{m.group(2)}" color="#006c46">{m.group(1)}</link>',text)
    text = re.sub(r'\[([^\]]+)\]\((?!https?://)[^)]+\)',r'\1 (local evidence; publication pending)',text)
    text = re.sub(r'`([^`]+)`',r'<font name="Courier">\1</font>',text)
    text = re.sub(r'\*\*([^*]+)\*\*',r'<b>\1</b>',text)
    return text

def p(text, style='Copy'): story.append(Paragraph(fmt(text),styles[style]))
def sub(text): p(text,'SubTitle')
def table(rows, widths=None):
    data=[[Paragraph(fmt(str(c)),styles['CellCopy']) for c in row] for row in rows]
    if widths is None: widths=[AREA/len(rows[0])]*len(rows[0])
    assert all(width > 20 for width in widths), widths
    assert abs(sum(widths)-AREA) < .01, widths
    t=Table(data,colWidths=widths,repeatRows=1,hAlign='LEFT')
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#e8f5ee')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4),('LINEBELOW',(0,0),(-1,0),.6,colors.HexColor('#95b5a7')),('LINEBELOW',(0,1),(-1,-1),.3,colors.HexColor('#cfdfd7'))]))
    story.append(t);story.append(Spacer(1,8))

def md(text):
    lines=text.splitlines(); buffer=[]; i=0;buffer_style='Copy'
    def flush():
        nonlocal buffer_style
        if buffer: p(' '.join(buffer),buffer_style);buffer.clear()
        buffer_style='Copy'
    while i<len(lines):
        line=lines[i].strip()
        if line.startswith('|'):
            flush();rows=[]
            while i<len(lines) and lines[i].strip().startswith('|'):
                row=[x.strip() for x in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r':?-+:?',v) for v in row): rows.append(row)
                i+=1
            if rows:
                n=len(rows[0]); widths=[AREA/n]*n
                if n==6: widths=[AREA*v for v in [.08,.10,.10,.31,.29,.12]]
                elif n==5: widths=[AREA*v for v in [.20,.09,.15,.43,.13]]
                elif n==4 and rows[0][0] in {'ID','Test ID'}: widths=[60,75,AREA*.42,AREA*.58-135]
                elif n==3: widths=([28,AREA*.44,AREA*.56-28] if rows[0][0]=='#' else ([50,AREA-110,60] if rows[0][0]=='ID' else [110,AREA-230,120]))
                elif n==2: widths=[85,AREA-85]
                table(rows,widths)
            continue
        if not line: flush()
        elif re.match(r'^#{1,6}\s',line): flush();sub(line.lstrip('# '))
        elif line.startswith('- '): flush();buffer_style='SmallCopy';buffer.append(line[2:])
        else: buffer.append(line)
        i+=1
    flush()

def source_doc(name, text):
    sub('Rendered '+name+' - selected current sections')
    p(f'Full maintained document: [{name}]({BASE}/blob/{REV}/docs/lab-04/{name}). This local review copy renders current excerpts; the complete local Markdown is also embedded. Dated history is retained in the source, not repeated here. Publication of the follow-up is pending.','CaptionCopy')
    md(text)

def doc(name): return (ROOT/'docs/lab-04'/name).read_text(encoding='utf-8')
def section(text,start,end=None):
    value=text.split(start,1)[1]
    return start+ (value.split(end,1)[0] if end else value)
def part(n,title):
    if story: story.append(PageBreak())
    p(f'Answer Part {n}:','PartTitle');sub(title)

def find(name,scope=None):
    results=[r for r in index if Path(r['destination']).name==name and (not scope or scope in r['destination'])]
    assert len(results)==1,(name,scope,len(results))
    r=results[0];path=EV/r['destination'];assert hashlib.sha256(path.read_bytes()).hexdigest()==r['sha256']
    return r,path

class Shot(Flowable):
    def __init__(self,path,box,scale):
        Flowable.__init__(self);self.path=path;self.box=box;self.scale=scale
        self.width=(box[2]-box[0])*scale;self.height=(box[3]-box[1])*scale
    def draw(self):
        with PILImage.open(self.path) as im:
            self.canv.drawImage(ImageReader(im.crop(self.box)),0,0,width=self.width,height=self.height)

class FigureContent:
    def __init__(self,title,caption,shot,narrow):
        self.title=title;self.caption=caption;self.shot=shot;self.narrow=narrow

def layout_figures(items):
    result=[];n=0
    while n<len(items):
        item=items[n]
        if not isinstance(item,FigureContent):result.append(item);n+=1;continue
        # Portrait pages give each capture a full-width panel. Pairing tablet
        # captures here would reduce native UI text to thumbnail size.
        panels=[item]
        cells=[]
        for panel in panels:
            cells.append([Paragraph(fmt(panel.title),styles['SubTitle']),Paragraph(fmt(panel.caption),styles['CaptionCopy']),panel.shot])
        widths=[AREA]
        t=Table([cells],colWidths=widths,hAlign='LEFT')
        t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),0)]))
        result.append(KeepTogether([t,Spacer(1,9)]));n+=1
    return result

def figure(name,title,scope=None,crop=None,maxheight=400,maxwidth=AREA):
    r,path=find(name,scope)
    with PILImage.open(path) as im: iw,ih=im.size
    box=crop or (0,0,iw,ih)
    maxheight=min(maxheight+200,640)
    maxwidth=min(maxwidth,AREA-9)
    assert 0<=box[0]<box[2]<=iw and 0<=box[1]<box[3]<=ih
    # Keep native UI text readable, splitting tall captures at quiet rows.
    if box[3]-box[1] > maxheight/.60:
        import math
        count=math.ceil((box[3]-box[1])/(maxheight/.60))
        edges=[box[1]]
        with PILImage.open(path) as im:
            gray=im.convert('L')
            for n in range(1,count):
                target=round(box[1]+(box[3]-box[1])*n/count)
                candidates=range(max(edges[-1]+40,target-24),min(box[3]-40,target+25))
                row=min(candidates,key=lambda y:(sum(v<160 for v in gray.crop((box[0],y,box[2],y+1)).getdata()),abs(y-target)))
                edges.append(row)
        edges.append(box[3])
        for n,(top,bottom) in enumerate(zip(edges,edges[1:]),1):
            figure(name,title+f' - excerpt {n}/{count}',scope,(box[0],top,box[2],bottom),maxheight,maxwidth)
        return
    narrow=False
    scale=min(maxwidth/(box[2]-box[0]),maxheight/(box[3]-box[1]),.85)
    caption=f'Figure {len(figure_records)+1} | {name} | application {REV[:7]}. '+('Excerpt: '+str(box)+'. Original full PNG retained.' if crop else 'Unmodified full region capture.')
    shot=Shot(path,box,scale);story.append(FigureContent(title,caption,shot,narrow))
    figure_records.append({'number':len(figure_records)+1,'file':r['destination'],'crop':box,'scale':scale,'body15pxEquivalentPt':round(15*scale,2)})

def responsive_region(prefix,title,scope=None):
    for width in [1440,768,390]:
        name=f'{prefix}-{width}.png';r,path=find(name,scope)
        with PILImage.open(path) as im: iw,ih=im.size
        split=None
        if split:
            figure(name,title+f' - {width}px, upper fields',scope,(0,0,iw,split),420)
            figure(name,title+f' - {width}px, remaining fields',scope,(0,split,iw,ih),420)
        else:figure(name,title+f' - {width}px',scope,maxheight=420)

part(1,'Git use and engineering workflow')
p('TokTickIT - Lab 4 review copy | 11 October 2026 | Pitchai Chadchuangchot, 67070501068. Peer: Phanuwit Butchari, 67070501070 (auto4496).')
p('Application release is reviewed and verified. This PDF is NOT submission-ready: the evidence follow-up is local, final author visual/PDF acceptance is pending, and Issue #44 is open/Started. It deliberately does not manufacture an all-Done board. After acceptance/publication, refresh the real board and rebuild the submission copy.')
p(f'[Repository]({BASE}) | [Release PR #51]({BASE}/pull/51) | [Project](https://github.com/users/Datakung/projects/1) | [Issue #44]({BASE}/issues/44)')
table([['Feature -> lab4-staging','Peer merge'],['#45 contract / ff97405','d32c8cf'],['#46 foundation / 4795f38','a915812'],['#47 action UI / 0cf9e58','f4da089'],['#48 workflow / b7f6bb9','00fddc1'],['#49 dashboards / 6dce864','4660ac6'],['#50 quality correction / f517961','9b5d3a5'],['#51 lab4-staging -> main','0f169ea; 02:34:13 Bangkok, October 11']])
sub('Actual issue/project snapshot')
project=json.loads((EV/'project-state.json').read_text(encoding='utf-8-sig'))
table([['Issue','Observed card','Acceptance boundary']]+[[str(r['issue']),r['status'],'Peer-accepted feature' if r['issue']!=44 else 'Reopened; final evidence/review remains'] for r in sorted(project,key=lambda r:r['issue'])],[80,120,AREA-200])
review=doc('reviewer.md')
source_doc('reviewer.md',review.split('## Contract review questions')[0]+section(review,'### Actual reapproval, release and final-main verification, October 11'))
sub('README, ignore rules and directory evidence')
p(f'[README]({BASE}/blob/{REV}/README.md) documents setup, guarded test/E2E configuration, seed/migration instructions, builds and review ports. [.gitignore]({BASE}/blob/{REV}/.gitignore) excludes dependencies, secrets, builds, uploads and routine test output. Scoped exceptions retain intentional logs. The local follow-up adds final-main log exceptions only.')
table([['Repository area','Purpose'],['client/src; client/tests/lab-01..04; client/e2e/lab-02..04','Role interfaces, component/style and browser regression'],['server/src; server/prisma/migrations; server/tests/lab-01..04','APIs, preserving schema and unit/integration/recovery tests'],['docs/lab-04/{specification,api-spec,ui-spec,tests,reviewer,ai-use}.md','Maintained engineering contract, traceability and actual review/AI record'],['artifacts/lab-04/{quality-gate,final-main,screenshots}; scripts/','Distinct historical/final evidence and reproducible guarded helpers']],[AREA*.48,AREA*.52])

part(2,'Spec DD - reviewed engineering contract')
p(f'The corrected contract ff97405 was [approved in PR #45]({BASE}/pull/45#pullrequestreview-5416186064) and merged as d32c8cf before the foundation/product PRs #46-50. The following renders the current normative contract, not the stakeholder handout verbatim.')
spec=doc('specification.md')
source_doc('specification.md',section(spec,'## 1. Sprint goal','## 12. Author-requested creation refinement'))
p(f'Exact REST payloads, authorization/error precedence and receipts: [api-spec.md]({BASE}/blob/{REV}/docs/lab-04/api-spec.md). No final-evidence operation changed API or schema behavior.')

part(3,'Test DD, traceability and final-main results')
p('One uninterrupted run on clean main 0f169ea: 02:39:09-02:45:43 Bangkok, October 11. Original complete terminal logs and individual-case JSON reports are embedded in this one PDF as attachments; do not substitute earlier feature totals.')
table([['Gate step','Exit','Seconds']]+[[r['name'],r['exitCode'],r['seconds']] for r in manifest['steps']],[AREA-140,60,80])
table([['Coverage','Actual final-main result'],['Server unit/API/integration/migration/recovery/regression','40 files / 298 passed; no skipped/todo'],['Client component/style/regression','23 files / 211 passed; no skipped/todo'],['Chromium end-to-end','49 passed; zero unexpected/skipped/flaky; retries=0'],['Gate-finalization regressions','10/10 passed'],['Production builds / Prisma / audits','Both builds and validation pass; four audits = zero findings'],['Development preservation','Identical expanded before/after fingerprint; preservationVerified=true']],[AREA*.45,AREA*.55])
p('SHA-256: '+manifest['developmentBefore'],'CodeCopy')
p('Complete logs are attached as server-tests.log, client-tests.log, browser-tests.log and gate-regressions.log. Complete per-case output is attached as server-results.json, client-results.json and browser-results.json. The manifest, parity record, screenshots index and complete six Markdown documents are attached too. Use a PDF viewer supporting file attachments.','SmallCopy')
tests=doc('tests.md')
test_excerpt=tests.split('### Issue #43 dashboard implementation and evidence')[0]
compact=[]
for line in test_excerpt.splitlines():
    if line.startswith('|') and line.count('|')==7:
        cells=[v.strip() for v in line.strip('|').split('|')]
        compact.append('| '+' | '.join([cells[0],cells[2],cells[3],cells[4]])+' |')
    else:compact.append(line)
test_excerpt='\n'.join(compact)
source_doc('tests.md',test_excerpt)

part(4,'AI use and My Reflection')
ai=doc('ai-use.md')
selected=ai.split('## Specification-agent and coding-agent use')[0]
reflection=section(ai,'Supplied by the author on 2026-10-10; lightly edited for grammar without adding')
source_doc('ai-use.md',selected)
sub('Specification-agent and coding-agent roles')
p('Specification support transformed the supplied sheet into numbered requirements/rules/criteria, role and transition matrices, database decisions and test plans before product coding. Coding support implemented the approved behavior and regressions, responded to real peer findings, and retained truthful failed/passing runs. Human input shaped UI size, clarity, equal controls, audit presentation and Ticket-local numbering. AI-generated work was checked through tests, peer review and author UI feedback; passing automation is not invented author visual acceptance.')
sub('My Reflection - supplied by the author')
p('AI helped me most by listing the details I needed for planning. I could also suggest my own ideas and incorporate them into the plan to make it more suitable. I still needed to check UI details myself, such as whether the buttons and page sizes were appropriate. Most of the checks I needed to make personally were on the frontend.')
p('The author reported the selected model as GPT-Sol 6.1. This records the supplied selection, not a reconstructed or independently verified model history for every turn. The reflection is grammar-edited only. The ten selected prompts above are actual recorded interactions; later release interactions remain supplementary.')

part(5,'Working IT Staff dashboard')
p('Backend repeatable-read snapshots provide active unassigned/owned work, all eight statuses, active priorities, current-user assigned actions and bounded recent/performed lists. Admin reuses Staff behavior; My counts use the signed-in actor, not another staff member. Detail lists read live data using exact captured filters. Initial loading is not fake zero; refresh failure labels the retained snapshot and offers Retry.')
table([['Actor / metric','API','Independent rows','Live list']]+[[r['role']+' / '+c['metric'],c['api'],c['database'],c['drillDownTotal']] for r in parity['comparisons'] if r['role']!='REQUESTER' for c in r['counts']],[AREA-200,50,85,65])
p('Raw query columns and independent row predicates, actor IDs, captured ranges, filters and list ordering are embedded in dashboard-parity.json. The supplementary screenshots below use that exact fixture population; the mutable earlier full-suite screenshots are not mixed with these counts.')
figure('staff-dashboard-1440.png','Operational snapshot - desktop','supplementary',(170,180,1270,850),450)
figure('staff-dashboard-768.png','Operational snapshot - tablet','supplementary',(20,180,748,1220),450)
figure('staff-dashboard-390.png','Operational snapshot - mobile work cards','supplementary',(0,600,390,1100),440)
figure('staff-work-1440.png','Current-user assigned work and Ticket-local Action labels','supplementary',(120,190,1320,780),400)

part(6,'Working Actions Taken')
p('Each Ticket has its own one-based Action display sequence; all creation-ordered records, cancelled work and prior cycles retain their positions. Global IDs still identify links, writes, receipts and immutable audit snapshots. Create starts Planned. Start changes only state to In progress; Complete requires a nonblank Result and explicit actual-performer confirmation. Cancel requires a reason. View/Edit, assignment and progress save independently.')
p('The 49-case browser run exercises different actors and multiple actions, assignment, edit/start/complete/cancel, required result/note/reason, inactive-assignee and Requester denial, stale conflicts, safe/uncertain outcomes and exact replay without duplicate records/events. API tests directly enforce authorization; hiding controls is not the protection.')
responsive_region('action-view','View-first action details')
responsive_region('action-edit','Explicit field editor and equal Save/Discard controls')
responsive_region('action-progress','Progress independent of Edit')
figure('action-confirm-complete-390.png','Completion Result and actual-performer confirmation')
figure('action-confirm-cancel-768.png','Explicit cancellation reason and equal Back controls')
figure('action-create-controls-1440.png','Equal Create/Discard controls')

part(7,'Working Ticket workflow')
p('Staff/Admin formal transitions follow the approved matrix; Requester indication is advisory. Whole-cycle resolution requires completed work, no active actions and no completed follow-up outstanding, including blockers beyond page one. Reopen advances the cycle and preserves previous work read-only. The API atomically rechecks versions/gates and appends history; lost responses block further writes until authoritative reload.')
responsive_region('status-selection','Saved status separate from proposed destination')
responsive_region('checklist-ready','Whole-cycle readiness with text and icons')
figure('later-page-blocker-1440.png','Page-two unfinished work still blocks resolution',None,(0,0,1100,515),400)
figure('reopened-390.png','Reopened cycle starts with no completed work',None,(0,0,358,625),400)
figure('reopened-390.png','Saved Reopened status and retained transition choices',None,(0,1136,358,1526),400)
responsive_region('audit-readable-staff','Append-only changed values and technical disclosure')

part(8,'Requester dashboard and final regression')
p('Requester metrics always include the authenticated owner. Active means New/Open/In Progress/Waiting for Requester/Reopened. Recent is the inclusive elapsed seven-day UTC interval, displayed in Bangkok. Legacy unknown resolution dates are not invented. Empty accounts receive real zeroes; wrong-role/ownership requests are denied. Recent/attention links reach owned filtered lists.')
table([['Requester fixture / metric','API','Independent rows','Live list']]+[[('Populated' if r['actorId']==11 else 'Empty')+' / '+c['metric'],c['api'],c['database'],c['drillDownTotal']] for r in parity['comparisons'] if r['role']=='REQUESTER' for c in r['counts']],[AREA-200,50,85,65])
figure('requester-dashboard-1440.png','Owned dashboard - desktop metrics','supplementary',(170,180,1270,575),440)
figure('requester-dashboard-1440.png','Owned dashboard - desktop recent/attention lists','supplementary',(170,575,1270,1220),440)
figure('requester-dashboard-768.png','Owned dashboard - tablet metrics','supplementary',(20,180,748,720),440)
figure('requester-dashboard-390.png','Owned dashboard - mobile, first work cards','supplementary',(0,545,390,875),440)
figure('requester-dashboard-390.png','Owned dashboard - mobile, recent work cards','supplementary',(0,877,390,1206),440)
sub('Representative preserved earlier behavior')
table([['Area','Actual final-main checks'],['Authentication / accounts','Login/change/logout/revocation and Admin lifecycle/final-admin/stale safeguards'],['Requester Ticket / attachments','Create/find/open; upload/download/remove; failed initial upload cannot falsely claim rollback or duplicate creation'],['Comments / Notes / Staff','Append-only authored Public Comments; Staff operations; Requester Notes route returns 403 without private text'],['Actions / transitions','Owned read-only shared history, immutable audit, terminal/prior-cycle locks; exact record deep links']],[240,AREA-240])
figure('public-comments-mobile.png','Shared comment remains readable on mobile','lab3-evidence/requester')
figure('user-row-mobile.png','Administrator account card - mobile')

part(9,'Zen Green, responsive and accessibility verification')
ui=doc('ui-spec.md')
source_doc('ui-spec.md',ui.split('## Requester dashboard')[0]+section(ui,'## Responsive and accessibility rules','## Planned evidence and checklist'))
sub('Completed recorded verification - separate from final author acceptance')
md((EV/'visual-checklist.md').read_text())
p('The fresh 192-image index covers three-width major Lab 4 screens and earlier role screens. Original assets have hashes and timestamps. Figures are readable full regions or labelled excerpts, not miniature full-page thumbnails. Application behavior/style is unchanged from the reviewed release. PDF/source acceptance is still pending; do not mark this review copy as final submission.')
figure('staff-work-768.png','Responsive My Actions - tablet navigation','supplementary',(0,180,768,445),440)
figure('staff-work-768.png','Responsive My Actions - tablet work card','supplementary',(0,452,768,780),440)
figure('staff-work-390.png','Responsive My Actions - mobile navigation','supplementary',(0,310,390,650),440)
figure('staff-work-390.png','Responsive My Actions - mobile work card','supplementary',(0,665,390,1020),440)
figure('requester-create-390.png','Create Ticket - mobile context','supplementary',(0,260,390,925),440)
figure('action-edit-controls-768.png','Aligned edit controls - tablet')
sub('Required final acceptance and publication')
p('Review this PDF and the fresh images. Publish the evidence follow-up through a reviewed PR; refresh actual final issue/project states after acceptance; rebuild the submission copy with working final-evidence links. Keep #44 open/Started until those checks genuinely finish. Actual reciprocal review is recorded in Answer Part 1, separately from author acceptance. No formal screen-reader certification is invented.')

def footer(canvas,doc):
    canvas.saveState();canvas.setStrokeColor(colors.HexColor('#a7c7b9'));canvas.line(36,31,W-36,31)
    canvas.setFont('Helvetica',8);canvas.setFillColor(colors.HexColor('#47615a'))
    canvas.drawString(36,18,'TokTickIT Lab 4 | REVIEW COPY | application '+REV[:7])
    canvas.drawRightString(W-36,18,str(doc.page));canvas.restoreState()

temp=OUT.with_name('TokTickIT-Lab4-Review-unattached.pdf')
SimpleDocTemplate(str(temp),pagesize=(W,H),leftMargin=36,rightMargin=36,topMargin=32,bottomMargin=42,title='TokTickIT Lab 4 - review copy',author='Pitchai Chadchuangchot').build(layout_figures(story),onFirstPage=footer,onLaterPages=footer)
reader=PdfReader(temp);writer=PdfWriter();writer.clone_document_from_reader(reader)
attachments=[EV/'gate'/name for name in ['manifest.json','server-tests.log','client-tests.log','browser-tests.log','gate-regressions.log','server-results.json','client-results.json','browser-results.json']]
attachments += [EV/'dashboard-parity.json',EV/'captured-screenshots.json',EV/'visual-checklist.md']
attachments += [ROOT/'docs/lab-04'/name for name in ['specification.md','tests.md','ui-spec.md','api-spec.md','reviewer.md','ai-use.md']]
for path in attachments: writer.add_attachment(path.name,path.read_bytes())
with OUT.open('wb') as stream:writer.write(stream)
temp.unlink()
check=PdfReader(OUT);text='\n'.join(page.extract_text() or '' for page in check.pages)
headings=re.findall(r'Answer Part ([1-9]):',text);assert headings==list('123456789'),headings
uris=[a.get_object()['/A'].get('/URI') for page in check.pages for a in page.get('/Annots',[]) if a.get_object().get('/A',{}).get('/S')=='/URI']
assert all(str(uri).startswith('https://github.com/') for uri in uris)
assert len(check.attachments)==len(attachments)
assert '\u25a0' not in text
(EV/'pdf-check.json').write_text(json.dumps({'pdf':str(OUT),'phase':'review-copy','pageFormat':'A4 portrait','pageSizePoints':[W,H],'pages':len(check.pages),'headingOrder':headings,'links':sorted(set(map(str,uris))),'embeddedFiles':sorted(check.attachments),'figures':figure_records,'authorFinalAcceptance':False,'publishedEvidence':False},indent=2))
print(json.dumps({'pages':len(check.pages),'figures':len(figure_records),'links':len(uris),'attachments':len(check.attachments),'pdf':str(OUT)}))
