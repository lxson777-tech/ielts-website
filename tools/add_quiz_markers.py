#!/usr/bin/env python3
"""
One-time script: adds <!-- QUIZ --><!-- /QUIZ --> markers and quiz nav links
to all applicable lesson HTML files, and adds quiz.js script tag.

Run from project root: python tools/add_quiz_markers.py
"""
import os, re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
LESSONS = os.path.join(ROOT, 'lessons')

# lesson -> (quiz_nav_num, new_samples_num)
# listening.html skipped (no quiz)
QUIZ_NAV = {
    'reading-task1.html':  (8, 9),
    'writing-task1.html':  (7, 8),
    'writing-task2.html':  (8, 9),
    'speaking-part1.html': (6, 7),
    'speaking-part2.html': (6, 7),
    'speaking-part3.html': (6, 7),
    'vocabulary.html':     (6, 7),
}

for fname, (quiz_num, samples_num) in QUIZ_NAV.items():
    path = os.path.join(LESSONS, fname)
    with open(path, 'r', encoding='utf-8') as f:
        html = f.read()

    # 1. Insert <!-- QUIZ --><!-- /QUIZ --> between <!-- /MATERIALS --> and <hr> before <!-- SAMPLES -->
    old_boundary = '<!-- /MATERIALS -->\n\n  <hr class="divider">\n  <!-- SAMPLES -->'
    new_boundary = ('<!-- /MATERIALS -->\n\n'
                    '  <hr class="divider">\n'
                    '  <!-- QUIZ --><!-- /QUIZ -->\n\n'
                    '  <hr class="divider">\n'
                    '  <!-- SAMPLES -->')
    if '<!-- QUIZ -->' not in html:
        html = html.replace(old_boundary, new_boundary)
        print(f'  OK  Added QUIZ marker to {fname}')
    else:
        print(f'  --  QUIZ marker already present in {fname}')

    # 2. Add quiz nav link before samples link and update samples number
    old_samples_link = f'<a href="#samples">{samples_num - 1}. Sample Tests</a>'
    new_links = (f'<a href="#quiz">{quiz_num}. Practice Quiz</a>\n'
                 f'  <a href="#samples">{samples_num}. Sample Tests</a>')
    if f'href="#quiz"' not in html:
        html = html.replace(old_samples_link, new_links)
        print(f'  OK  Added quiz nav link to {fname}')
    else:
        print(f'  --  Quiz nav link already present in {fname}')

    # 3. Add quiz.js script tag before </body>
    if 'quiz.js' not in html:
        html = html.replace(
            '<script src="../assets/transitions.js"></script>\n</body>',
            '<script src="../assets/transitions.js"></script>\n<script src="../assets/quiz.js"></script>\n</body>'
        )
        print(f'  OK  Added quiz.js script to {fname}')
    else:
        print(f'  --  quiz.js already present in {fname}')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(html)

print('\nDone.')
