/* Interactive practice exercises for the Listening lessons (the four
   Part pages and the six question-type pages). GENERATED from the site's own
   imported full IELTS Listening tests (src/data/tests/listening-full-0XX.ts)
   - every question, answer, explanation and audio clip here was taken from a
   real test, not written by hand. Re-run with:

       python tools/build_listening_practice.py

   See workflows/build_listening_practice.md for what the script does and how
   it picks material. Rendered by src/components/PracticeQuiz.tsx, same
   component used for the Reading question-type pages; the optional
   `segments` array groups questions under their own audio clip + transcript,
   for sets built from more than one source test. */

import type { PracticeSet } from './reading-practice';

/** One audio clip (plus optional transcript / reference images) backing a
    run of questions within a practice set. A set built from a single source
    (the four Part lessons) has one segment covering every question; a set
    combining two different tests (the six question-type lessons) has one
    segment per source group, and each question's `segment` index below says
    which one it belongs to. */
export interface ListeningPracticeSegment {
  src?: string;
  startSeconds?: number;
  endSeconds?: number;
  /** Attribution shown near the player, e.g. "Listening Test 12, Part 3,
      Questions 21 to 25". */
  source?: string;
  /** Shown as a collapsible "Transcript" once the set is finished. */
  transcriptHtml?: string;
  /** Reference picture(s) for a map/plan/diagram-labelling segment. */
  images?: { src: string; alt: string }[];
}

/* Declared here via module augmentation, rather than editing
   reading-practice.ts (edited concurrently by another agent working on the
   Reading passages), so the two fields above can be added to the shared
   PracticeSet / PracticeQuestion shape without touching that file. */
declare module './reading-practice' {
  interface PracticeSet {
    segments?: ListeningPracticeSegment[];
  }
  interface PracticeQuestion {
    /** Index into this set's `segments`, grouping the question under a
        particular audio clip / transcript / image. Undefined = no audio. */
    segment?: number;
  }
}

export const LISTENING_PRACTICE: Record<string, PracticeSet> = {
  "part1": {
    "title": "Exercise. Real questions from IELTS Listening Test 1, Part 1",
    "intro": "Answer using the actual recording below, the same one real students hear on this test.",
    "segments": [
      {
        "src": "/audio/listening/test-001.mp3",
        "startSeconds": 0.0,
        "endSeconds": 535.39,
        "source": "Listening Test 1, Part 1, Questions 1 to 10",
        "transcriptHtml": "<p class=\"transcript-note\">Automatic transcript. It may contain small recognition errors; the answer key is authoritative.</p><p><span class=\"ts\">[00:01]</span> CD2, test 3. You will hear a number of different recordings, and you will have to answer questions on what you hear. There will be time for you to read the instructions and questions, and you will have a chance to check your work. All the recordings will be played once only. The test is in 4 sections. At the end of the test, you will be given 10 minutes to transfer</p><p><span class=\"ts\">[00:36]</span> your answers to an answer sheet. Now turn to section 1, section 1. You will hear a telephone conversation between a travel company employee and a customer. First, you have some time to look at questions 1 to 5. Now we shall begin. You should answer the questions as you listen, because you will not hear the recording a second time. Listen carefully and answer questions 1 to</p><p><span class=\"ts\">[01:39]</span> 5. Greek Island holidays, can I help you? Yes, I hope so. I have a friend who&#x27;s just come back from Corfu, and she&#x27;s recommended some apartments in Arilis. She thought they might be on your list. Arilis, Arilis, let me see. Can you give me the names? Yes, the first Rose Garden apartment. I&#x27;d like to go with another friend in the last week of October. Well, we&#x27;ve got a lovely studio flat</p><p><span class=\"ts\">[02:13]</span> available at that time. I&#x27;m sure you&#x27;d enjoy the entertainment program there too, with Greek dancing in the restaurant. And the cost for each of us? £219. That sounds very reasonable. I&#x27;m just jotting down some notes. Now the second one she mentioned was called Blue Bay. Blue Bay. Yes, in fact that&#x27;s very popular, and it has some special features. Really?</p><p><span class=\"ts\">[02:42]</span> The main attraction is the large swimming pool with salt water. Much healthier, I understand. That&#x27;s right, and it isn&#x27;t far from the beach either, only 300 metres. And only around half a kilometre to some shops, so you don&#x27;t have to be too energetic. Is it much more expensive than the first one? Let me just check. I think at the time you want to go, it&#x27;s around 260 pounds.</p><p><span class=\"ts\">[03:10]</span> No, 275 pounds to be exact. Right, I&#x27;ve got that. Now there are just two more apartments to ask you about. I can&#x27;t read my own writing. Something to do with sunshine, is it? I think you meant the sunshade apartments. They&#x27;re on a mountain side. Any special features? Yes, each room has its own sun terrace, and they&#x27;re a shared barbecue</p><p><span class=\"ts\">[03:36]</span> facilities. Oh, sounds lovely. Yes, it is rather well equipped. It also provides water sports, it has its own beach. There are facilities for water skiing. Any kite surfing? My friend&#x27;s quite keen. Not at the hotel, but I&#x27;m sure you&#x27;ll find some in Arilis. There&#x27;s also satellite TV in the apartments. And how much is that one? 490 pounds with two sharing. You mean 245 pounds each?</p><p><span class=\"ts\">[04:08]</span> I&#x27;m afraid not. Each person has to pay that amount and there must be at least two in an apartment. Oh, I don&#x27;t think that would be within our budget, unfortunately. And the last one sounds a bit expensive too, the grand? Actually, it&#x27;s quite reasonable. It&#x27;s an older style house with Greek paintings in every room and a balcony outside. Sounds nice. What are the views like? Well,</p><p><span class=\"ts\">[04:33]</span> there are forests all round and they hide a supermarket just down the road, so that&#x27;s very useful for all your shopping needs. There&#x27;s a disco in the area too. And the price? 319 pounds at that time. But if you leave it till November, it goes down by 40%. Too late, I&#x27;m afraid. Well, why don&#x27;t I send you a brochure with full details, miss?</p><p><span class=\"ts\">[04:59]</span> Nash. But don&#x27;t worry about that. I&#x27;m coming to Upminster soon and I&#x27;ll call and get one. I just wanted to get an idea first. Well, that&#x27;s fine. We&#x27;ve got plenty here when you come. Before you hear the rest of the conversation, you have some time to look at questions 6 to 10. Now listen and answer questions 6 to 10. If you&#x27;ve got a minute, could I just check a</p><p><span class=\"ts\">[06:00]</span> couple of points about insurance? I got one policy through the post but I&#x27;d like to see if yours is better. Fine. What would you like to know? Well, the one I&#x27;ve got has benefits and then the maximum amount you can claim. Is that like yours? Yes. That&#x27;s how most of them are. Well, the first thing is cancellation. If the holiday&#x27;s cancelled on the policy I&#x27;ve got,</p><p><span class=\"ts\">[06:24]</span> you can claim £8,000. We can improve on that, Miss Nash. For Greek island holidays, our maximum is £10,000. That&#x27;s good. Of course our holiday won&#x27;t even cost £1,000 together. It&#x27;s still sensible to have good cover. Now, if you go to hospital, we allow £600. Yes, mine&#x27;s similar. And we also allow a relative to travel to your holiday resort. My policy just says their</p><p><span class=\"ts\">[06:52]</span> representative will help you. You can see there&#x27;s another difference there. And what happens if you don&#x27;t get on the plane? Nothing, as far as I can see on this form. Don&#x27;t you have Miss Departure? No, I&#x27;ll just drop that down. We pay up to £1,000 for that, depending on the reason. And we&#x27;re particularly generous about loss of personal belongings,</p><p><span class=\"ts\">[07:18]</span> up to £3,000. But not more than £500 for a single item. Then I&#x27;d better not take my laptop. Not unless you ensure it separately. OK, thanks very much for your time. You&#x27;ve really been helpful. Can I get back to you? Your name is...</p><p><span class=\"ts\">[07:34]</span> Ben, Ludlow. That&#x27;s L-U-D-L-O-W. I&#x27;m the assistant manager here. I&#x27;ll give you my number. It&#x27;s 081-260-543-216. But didn&#x27;t I phone 081-260-567-294? That&#x27;s what I&#x27;ve got on the paper. That&#x27;s the main switchboard. I&#x27;ve given you my direct line. Right. Thank you very much for your time.</p><p><span class=\"ts\">[08:11]</span> That is the end of section one. You now have half a minute to check your answers. Now turn to section two.</p>"
      }
    ],
    "questions": [
      {
        "prompt": "– Just _____ meters from beach – Near shops",
        "kind": "text",
        "answer": "300",
        "explanation": "At 02:42 the agent says Blue Bay is \"only 300 metres\" from the beach, giving the missing distance.",
        "segment": 0
      },
      {
        "prompt": "_____ Apartments",
        "kind": "text",
        "answer": "sunshade",
        "explanation": "At 03:10 the agent corrects himself: \"I think you meant the sunshade apartments.\"",
        "segment": 0
      },
      {
        "prompt": "Greek paintings and _____",
        "kind": "text",
        "answer": "balcony",
        "explanation": "At 04:08 the agent says the Grand has Greek paintings in every room \"and a balcony outside\".",
        "segment": 0
      },
      {
        "prompt": "– Overlooking _____ – Near a supermarket and a disco",
        "kind": "text",
        "answer": [
          "forest",
          "forests"
        ],
        "explanation": "At 04:33 the agent says the Grand overlooks an area where \"there are forests all round\".",
        "segment": 0
      },
      {
        "prompt": "The Grand: _____ £",
        "kind": "text",
        "answer": "319",
        "explanation": "At 04:33 the agent gives the Grand's price as \"319 pounds at that time\".",
        "segment": 0
      },
      {
        "prompt": "Cancellation: _____ £",
        "kind": "text",
        "answer": "10,000",
        "explanation": "At 06:24 the agent says the cancellation cover is \"our maximum is £10,000\".",
        "segment": 0
      },
      {
        "prompt": "£ 600 additional benefit allows a _____ to travel to resort",
        "kind": "text",
        "answer": "relative",
        "explanation": "At 06:24 the agent says the hospital benefit also lets \"a relative to travel to your holiday resort\".",
        "segment": 0
      },
      {
        "prompt": "_____ departure",
        "kind": "text",
        "answer": "missed",
        "explanation": "At 06:52 the agent discusses \"Miss Departure\" cover, paying up to £1,000; the transcript mishears \"missed departure\".",
        "segment": 0
      },
      {
        "prompt": "Up to £ 3000 £ 500 for one _____",
        "kind": "text",
        "answer": "item",
        "explanation": "At 07:18 the agent caps personal belongings cover at \"not more than £500 for a single item\".",
        "segment": 0
      },
      {
        "prompt": "Name of assistant manager: Ben _____",
        "kind": "text",
        "answer": "Ludlow",
        "explanation": "At 07:34 the assistant manager spells his surname: \"Ben, Ludlow. That's L-U-D-L-O-W.\"",
        "segment": 0
      }
    ]
  },
  "part2": {
    "title": "Exercise. Real questions from IELTS Listening Test 1, Part 2",
    "intro": "Answer using the actual recording below, the same one real students hear on this test.",
    "segments": [
      {
        "src": "/audio/listening/test-001.mp3",
        "startSeconds": 535.39,
        "endSeconds": 891.07,
        "source": "Listening Test 1, Part 2, Questions 11 to 20",
        "transcriptHtml": "<p class=\"transcript-note\">Automatic transcript. It may contain small recognition errors; the answer key is authoritative.</p><p><span class=\"ts\">[08:55]</span> Section two. You will hear a talk on local radio about a children&#x27;s theme park. First, you have some time to look at questions 11 to 13. Now listen carefully and answer questions 11 to 13. For the second in our series about locally-run businesses, we meet Simon Winridge, co-founder of the hugely successful Winridge Forest Railway Park. Welcome, Simon.</p><p><span class=\"ts\">[09:49]</span> Now, perhaps you can begin by telling us a little bit about how it all started. Well, during the 1970s, my wife Liz and I had just acquired 80 acres of sheep farming land and we decided to settle down and have children. Pretty soon we had a daughter, Sarah and the son, Duncan. The place was wonderful for the kids. They particularly loved trains and gradually</p><p><span class=\"ts\">[10:15]</span> built up an enormous network of miniature railway track. I began to develop larger scale models of locomotives, but we didn&#x27;t think anything more of it until I went on a trip to a theme park near Birmingham and decided we could do a much better job. So we set up a small one ourselves based on the miniature railway and we opened to the public for just a month that year, 1984, in July,</p><p><span class=\"ts\">[10:42]</span> our driest month, because our children said they didn&#x27;t want our guests to have a miserable wet visit. I dealt with park business and Liz carried on with the farm work. It soon became clear that we were on to a winner. We began to extend the railway track and lay it among more interesting landscape by planting trees, which in turn attracted more wildlife,</p><p><span class=\"ts\">[11:08]</span> and by making cuttings through the rock. Nowadays we&#x27;re open all year round and we&#x27;re pleased to say that Wimridge is one of the most popular visitor attractions in the area with 50,000 visitors a year. A million and a half people have been through our doors since we opened. Before you hear the rest of the talk, you have some time to look at questions 14 to 20.</p><p><span class=\"ts\">[12:07]</span> Now listen and answer questions 14 to 20. All these visitors mean we have had to expand our operation and it&#x27;s now a truly family concern. I&#x27;m near to retirement age so I only concern myself with looking after the mechanical side of things, keeping the trains going. Liz now devotes all her energies to recruiting and supporting the large squadron of workers,</p><p><span class=\"ts\">[12:37]</span> which keep the place running smoothly. We&#x27;re really pleased that after some years away teaching, Sarah has now returned to the park and make sure the visitors are kept fed and watered, which keeps her pretty busy, as you can imagine. Our son Duncan has been a stalwart of the park for the last 10 years, taking over from me and the area of construction and I&#x27;ll say a little bit</p><p><span class=\"ts\">[13:01]</span> more about that in the moment. And his new wife, Judith, has also joined the team in charge of retail. That&#x27;s becoming a tremendous growth area for us. A lot of people want to buy souvenirs. So have you finished your development of the site for the moment? Not at all. We&#x27;re constantly looking for ways to offer more to our visitors. The railway remains</p><p><span class=\"ts\">[13:23]</span> the central feature, and there&#x27;s now 1.2 kilometres of the line laid, but we&#x27;d like to lay more. Because of the geology of the area, our greatest problem is digging tunnels. But we&#x27;re gradually overcoming that. We&#x27;re also very pleased with a new installation of the go-kart arena, which is 120 square metres in area. Again, the problem is the geology. We had to level the</p><p><span class=\"ts\">[13:49]</span> mounds on the track for safety reasons. We wanted to enable 5 to 12 year olds to use the go-karts. And the main attraction here is the Formula One cart. We&#x27;ve known fights to break out over who gets it. And then, finally, to our most recent development, which is the landscape swimming. That is the end of section 2. You now have half a minute to check your answers.</p>"
      }
    ],
    "questions": [
      {
        "prompt": "Simon’s idea for a theme park came from",
        "kind": "choice",
        "options": [
          {
            "value": "A",
            "label": "A) his childhood hobby"
          },
          {
            "value": "B",
            "label": "B) his interest in landscape design"
          },
          {
            "value": "C",
            "label": "C) his visit to another park"
          }
        ],
        "answer": "C",
        "explanation": "At 10:15 Simon says the idea came after \"I went on a trip to a theme park near Birmingham and decided we could do a much better job.\"",
        "segment": 0
      },
      {
        "prompt": "When they started, the family decided to open the park only when",
        "kind": "choice",
        "options": [
          {
            "value": "A",
            "label": "A) the weather was expected to be good"
          },
          {
            "value": "B",
            "label": "B) the children weren’t at school"
          },
          {
            "value": "C",
            "label": "C) there were fewer farming commitments"
          }
        ],
        "answer": "A",
        "explanation": "At 10:42 Simon says they opened only in July, \"our driest month\", so wet weather was not expected.",
        "segment": 0
      },
      {
        "prompt": "Since opening, the park has had",
        "kind": "choice",
        "options": [
          {
            "value": "A",
            "label": "A) 50,000 visitors"
          },
          {
            "value": "B",
            "label": "B) 1,000,000 visitors"
          },
          {
            "value": "C",
            "label": "C) 1,500,000 visitors"
          }
        ],
        "answer": "C",
        "explanation": "At 11:08 Simon says \"a million and a half people have been through our doors since we opened\", matching 1,500,000 visitors.",
        "segment": 0
      },
      {
        "prompt": "Simon",
        "kind": "select",
        "options": [
          {
            "value": "A",
            "label": "A) advertising"
          },
          {
            "value": "B",
            "label": "B) animal care"
          },
          {
            "value": "C",
            "label": "C) building"
          },
          {
            "value": "D",
            "label": "D) educational links"
          },
          {
            "value": "E",
            "label": "E) engine maintenance"
          },
          {
            "value": "F",
            "label": "F) food and drink"
          },
          {
            "value": "G",
            "label": "G) sales"
          },
          {
            "value": "H",
            "label": "H) staffing"
          }
        ],
        "answer": "E",
        "explanation": "At 12:07 Simon says he now \"only concern[s] myself with looking after the mechanical side of things, keeping the trains going\", i.e. engine maintenance.",
        "segment": 0
      },
      {
        "prompt": "Liz",
        "kind": "select",
        "options": [
          {
            "value": "A",
            "label": "A) advertising"
          },
          {
            "value": "B",
            "label": "B) animal care"
          },
          {
            "value": "C",
            "label": "C) building"
          },
          {
            "value": "D",
            "label": "D) educational links"
          },
          {
            "value": "E",
            "label": "E) engine maintenance"
          },
          {
            "value": "F",
            "label": "F) food and drink"
          },
          {
            "value": "G",
            "label": "G) sales"
          },
          {
            "value": "H",
            "label": "H) staffing"
          }
        ],
        "answer": "H",
        "explanation": "At 12:07 Simon says Liz \"devotes all her energies to recruiting and supporting the large squadron of workers\", i.e. staffing.",
        "segment": 0
      },
      {
        "prompt": "Sarah",
        "kind": "select",
        "options": [
          {
            "value": "A",
            "label": "A) advertising"
          },
          {
            "value": "B",
            "label": "B) animal care"
          },
          {
            "value": "C",
            "label": "C) building"
          },
          {
            "value": "D",
            "label": "D) educational links"
          },
          {
            "value": "E",
            "label": "E) engine maintenance"
          },
          {
            "value": "F",
            "label": "F) food and drink"
          },
          {
            "value": "G",
            "label": "G) sales"
          },
          {
            "value": "H",
            "label": "H) staffing"
          }
        ],
        "answer": "F",
        "explanation": "At 12:37 Simon says Sarah \"make[s] sure the visitors are kept fed and watered\", i.e. food and drink.",
        "segment": 0
      },
      {
        "prompt": "Duncan",
        "kind": "select",
        "options": [
          {
            "value": "A",
            "label": "A) advertising"
          },
          {
            "value": "B",
            "label": "B) animal care"
          },
          {
            "value": "C",
            "label": "C) building"
          },
          {
            "value": "D",
            "label": "D) educational links"
          },
          {
            "value": "E",
            "label": "E) engine maintenance"
          },
          {
            "value": "F",
            "label": "F) food and drink"
          },
          {
            "value": "G",
            "label": "G) sales"
          },
          {
            "value": "H",
            "label": "H) staffing"
          }
        ],
        "answer": "C",
        "explanation": "At 12:37 Simon says Duncan took over \"the area of construction\", i.e. building.",
        "segment": 0
      },
      {
        "prompt": "Judith   Area of work",
        "kind": "select",
        "options": [
          {
            "value": "A",
            "label": "A) advertising"
          },
          {
            "value": "B",
            "label": "B) animal care"
          },
          {
            "value": "C",
            "label": "C) building"
          },
          {
            "value": "D",
            "label": "D) educational links"
          },
          {
            "value": "E",
            "label": "E) engine maintenance"
          },
          {
            "value": "F",
            "label": "F) food and drink"
          },
          {
            "value": "G",
            "label": "G) sales"
          },
          {
            "value": "H",
            "label": "H) staffing"
          }
        ],
        "answer": "G",
        "explanation": "At 13:01 Simon says Judith \"joined the team in charge of retail\", i.e. sales.",
        "segment": 0
      },
      {
        "prompt": "_____ sq mt",
        "kind": "text",
        "answer": "120",
        "explanation": "At 13:23 Simon gives the go-kart arena's size as \"120 square metres in area\".",
        "segment": 0
      },
      {
        "prompt": "_____ yaer olds",
        "kind": "text",
        "answer": "5-12",
        "explanation": "At 13:49 Simon says they \"wanted to enable 5 to 12 year olds to use the go-karts\".",
        "segment": 0
      }
    ]
  },
  "part3": {
    "title": "Exercise. Real questions from IELTS Listening Test 1, Part 3",
    "intro": "Answer using the actual recording below, the same one real students hear on this test.",
    "segments": [
      {
        "src": "/audio/listening/test-001.mp3",
        "startSeconds": 891.07,
        "endSeconds": 1253.12,
        "source": "Listening Test 1, Part 3, Questions 21 to 30",
        "transcriptHtml": "<p class=\"transcript-note\">Automatic transcript. It may contain small recognition errors; the answer key is authoritative.</p><p><span class=\"ts\">[14:51]</span> Now turn to section 3. Section 3. You will hear a geography student called Caroline, discussing her dissertation with her tutor. First, you have some time to look at questions 21 to 23. Now listen carefully and answer questions 21 to 23. Ah, Caroline. Come on in, sit down. Thanks.</p><p><span class=\"ts\">[15:40]</span> So how&#x27;s the dissertation planning going? Well, Dr. Schulman, I&#x27;m still having a lot of trouble deciding on a title. Well, that&#x27;s perfectly normal at this stage. And this is what your tutorials will help you to do. Right. What we&#x27;ll do is jot down some points that might help you in your decision. First of all, you have chosen your general topic area, haven&#x27;t you? Yes. It&#x27;s</p><p><span class=\"ts\">[16:06]</span> the fishing industry. Oh yes, that was one of the areas you mentioned. Now, what aspects of the course are you good at? Well, I think I&#x27;m coping well with statistics and I&#x27;m never bored by it. Good. Anything else? Well, I&#x27;ve found computer modelling fascinating. I have no problem following what&#x27;s being taught, whereas quite a few of my classmates find it difficult.</p><p><span class=\"ts\">[16:35]</span> Well, that&#x27;s very good. Do you think these might be areas you could bring into your dissertation? Oh yes. If possible. It&#x27;s just that I&#x27;m having difficulty thinking how I can do that. You see, I feel I don&#x27;t have sufficient background information. I see. Well, do you take notes? I&#x27;m very weak at note taking. My teachers always used to say that.</p><p><span class=\"ts\">[16:59]</span> Well, I think you really need to work on these weaknesses before you go any further. What do you suggest? Before you hear the rest of the tutorial, you have some time to look at questions 24 to 30. Now listen and answer questions 24 to 30. Well, I can go through the possible strategies with you and let you decide where to go from there.</p><p><span class=\"ts\">[17:50]</span> Okay, thanks. Well, some people find it helpful to organize peer group discussions. You know, each week a different person studies a different topic and shares it with the group. Oh, right. It really helps build confidence. Yeah. You know, having to present something to others. I can see that.</p><p><span class=\"ts\">[18:10]</span> The drawback is that everyone in the group seems to share the same ideas. They keep being repeated in all the dissertations. Okay. You could also try a service called Student Support. It&#x27;s designed to give you a structured program over a number of weeks to develop your skills. Sounds good? Yes. Unfortunately, there are only a few places. But it&#x27;s worth looking into.</p><p><span class=\"ts\">[18:35]</span> Yes, of course. I know I&#x27;ve got to work on my study skills. And then there are several study skills books you can consult. Right. They&#x27;ll be a good source of reference. But the problem is there are sometimes too general. Yes, that&#x27;s what I found. Other than that, I would strongly advise quite simple ideas</p><p><span class=\"ts\">[18:58]</span> like using a card index. Well, yes, I&#x27;ve never done that before. It&#x27;s simple. But it really works because you have to get points down in a small space. Another thing I always advise is don&#x27;t just take your notes and forget about them. Read everything three times. That&#x27;ll really fix them in your mind.</p><p><span class=\"ts\">[19:20]</span> Yes. I can see it to take discipline, but... Well, if you establish good study skills at this stage, they&#x27;ll be with you all your life. Oh, yes, I completely agree. It&#x27;s just that I don&#x27;t seem to be able to discipline myself. I need to talk things over.</p><p><span class=\"ts\">[19:38]</span> Well, we&#x27;ll be continuing these tutorials, of course. Let&#x27;s arrange next months now. Let&#x27;s see. I can see you virtually any time during the week starting the 22nd of January. What about the 24th? I&#x27;m free in the afternoon.</p><p><span class=\"ts\">[20:00]</span> Sorry, I&#x27;m booked then. What about the following day? The first day I can make the morning. Fine. We&#x27;ll go for the 25th then. That&#x27;s great. Thanks. That is the end of section three.</p><p><span class=\"ts\">[20:19]</span> You now have half a minute to check your answers.</p>"
      }
    ],
    "questions": [
      {
        "prompt": "Dissertation topic: the _____",
        "kind": "text",
        "answer": "fishing industry",
        "explanation": "At 16:06 Caroline confirms her topic area is \"the fishing industry\".",
        "segment": 0
      },
      {
        "prompt": "Strengths: _____",
        "kind": "text",
        "answer": "statistics",
        "explanation": "At 16:06 Caroline says she is \"coping well with statistics and I'm never bored by it\".",
        "segment": 0
      },
      {
        "prompt": "Poor _____",
        "kind": "text",
        "answer": "note-taking",
        "explanation": "At 16:35 Caroline admits she is \"very weak at note taking\".",
        "segment": 0
      },
      {
        "prompt": "Increase _____",
        "kind": "text",
        "answer": "confidence",
        "explanation": "At 17:50 the tutor says peer group discussion \"really helps build confidence\".",
        "segment": 0
      },
      {
        "prompt": "Dissertations tend to contain the same _____",
        "kind": "text",
        "answer": "ideas",
        "explanation": "At 18:10 the tutor warns that in peer groups everyone \"seems to share the same ideas\", which then repeat in the dissertations.",
        "segment": 0
      },
      {
        "prompt": "Use the _____ service",
        "kind": "text",
        "answer": "student support",
        "explanation": "At 18:10 the tutor suggests \"a service called Student Support\" with a structured programme.",
        "segment": 0
      },
      {
        "prompt": "Limited _____",
        "kind": "text",
        "answer": "places",
        "explanation": "At 18:10 the tutor warns that for Student Support \"there are only a few places\".",
        "segment": 0
      },
      {
        "prompt": "Can be too _____",
        "kind": "text",
        "answer": "general",
        "explanation": "At 18:35 the tutor says study skills books \"are sometimes too general\".",
        "segment": 0
      },
      {
        "prompt": "Read all notes _____",
        "kind": "text",
        "answer": "3 times",
        "explanation": "At 18:58 the tutor advises \"read everything three times\" to fix notes in mind.",
        "segment": 0
      },
      {
        "prompt": "Next tutorial date: _____",
        "kind": "text",
        "answer": "25",
        "explanation": "At 20:00 they agree on the date: \"We'll go for the 25th then.\"",
        "segment": 0
      }
    ]
  },
  "part4": {
    "title": "Exercise. Real questions from IELTS Listening Test 1, Part 4",
    "intro": "Answer using the actual recording below, the same one real students hear on this test.",
    "segments": [
      {
        "src": "/audio/listening/test-001.mp3",
        "startSeconds": 1253.12,
        "endSeconds": 1672.05,
        "source": "Listening Test 1, Part 4, Questions 31 to 40",
        "transcriptHtml": "<p class=\"transcript-note\">Automatic transcript. It may contain small recognition errors; the answer key is authoritative.</p><p><span class=\"ts\">[20:53]</span> Now turn to section four. Section four. You will hear part of a lecture about an experimental design for a house. First, you have some time to look at questions 31 to 40. Now listen carefully and answer questions 31 to 40.</p><p><span class=\"ts\">[22:02]</span> Good morning. In the last few lectures, I&#x27;ve been talking about the history of domestic building construction. But today I want to begin looking at some contemporary experimental designs for housing. So, I&#x27;m going to start with a house which is constructed more or less under the ground.</p><p><span class=\"ts\">[22:24]</span> And one of the interesting things about this project is that the owners, both professionals, but not architects, wanted to be closely involved so they decided to manage the project themselves. Their chief aim was to create somewhere that was as environmentally friendly as possible. But at the same time, they wanted to live somewhere peaceful.</p><p><span class=\"ts\">[22:51]</span> They&#x27;d both grown up in a rural area and disliked urban life. So the first thing they did was to look for a site and they found a disused stone quarry in a beautiful area. The price was relatively low and they liked the idea of recycling the land as it were. As it was, the quarry was an ugly blot on the landscape and it wasn&#x27;t productive</p><p><span class=\"ts\">[23:19]</span> any longer either. They consulted various architects and looked at a number of designs before finally deciding on one. As I&#x27;ve said, it was a design for a sort of underground house and it was built into the earth itself with two stories. The north, east and west sides were set in the earth and only the sloping south-facing side was exposed to the light.</p><p><span class=\"ts\">[23:53]</span> That was made of a double layer of very strong glass. There were also photovoltaic tiles fixed to the top and bottom of this sloping wall. These are tiles that are designed to store energy from the sun and the walls had a layer of foam around them too to increase the insulation. Now what is of interest to us about this project is the features which make the building energy</p><p><span class=\"ts\">[24:29]</span> efficient. Sunlight floods in through the glass wall and to maximize it there are lots of mirrors and windows inside the house. That helps to spread the light around so that&#x27;s the first thing. Light is utilized as fully as possible. In addition, the special tiles on the outside convert energy from the sun and generate some of the house&#x27;s electricity. In fact,</p><p><span class=\"ts\">[24:59]</span> and it is possible that in future the house may even generate an electricity surplus and that the owners will be able to sell some to the national grid as well as that wherever possible recycled materials have been used. For example, the floors are made of reclaimed wood and the owners haven&#x27;t bought a single item of new furniture. They just kept what they already had.</p><p><span class=\"ts\">[25:31]</span> And then there&#x27;s the system for dealing with the waste produced in the house. This is dealt with organically. It&#x27;s purified by being filtered through reed beds which have been planted for that purpose in the garden so the occupants of the house won&#x27;t pollute the land or use any damaging chemicals. It&#x27;s true that the actual construction of the house was harmful to the</p><p><span class=\"ts\">[25:59]</span> environment mainly because they had to use massive amounts of concrete, one of the biggest sources of carbon dioxide in manufacturing. And as you know, this is very damaging to the environment. In total, the house construction has released 70 tons of carbon dioxide into the air. Now that&#x27;s a frightening thought. However, once the initial debt has been cleared and it&#x27;s been</p><p><span class=\"ts\">[26:32]</span> calculated that this will only take 15 years, this underground house won&#x27;t cost anything environmentally, I mean, because unlike ordinary houses, it is run in a way that is completely environmentally friendly. So eco-housing like this is likely to become much more. That is the end of section 4. You now have half a minute to check your answers. That is the end</p><p><span class=\"ts\">[27:36]</span> of the listening test. In the IELTS test, you would now have 10 minutes to transfer your answers to the answer sheet.</p>"
      }
    ],
    "questions": [
      {
        "prompt": "The owners of the underground house",
        "kind": "choice",
        "options": [
          {
            "value": "A",
            "label": "A) had no experience of living in a rural area"
          },
          {
            "value": "B",
            "label": "B) were interested in environmental issues"
          },
          {
            "value": "C",
            "label": "C) wanted a professional project manager"
          }
        ],
        "answer": "B",
        "explanation": "At 22:24 the lecturer says the owners' \"chief aim was to create somewhere that was as environmentally friendly as possible\".",
        "segment": 0
      },
      {
        "prompt": "What does the speaker say about the site of the house?",
        "kind": "choice",
        "options": [
          {
            "value": "A",
            "label": "A) The land was quite cheap"
          },
          {
            "value": "B",
            "label": "B) Stone was being extracted nearby"
          },
          {
            "value": "C",
            "label": "C) It was in a completely unspoilt area"
          }
        ],
        "answer": "A",
        "explanation": "At 22:51 the lecturer says of the quarry site: \"The price was relatively low.\"",
        "segment": 0
      },
      {
        "prompt": "• The south-facing side was constructed of two layers of _____",
        "kind": "text",
        "answer": "glass",
        "explanation": "At 23:53 the lecturer says the south-facing side \"was made of a double layer of very strong glass\".",
        "segment": 0
      },
      {
        "prompt": "• A layer of foam was used to improve the _____",
        "kind": "text",
        "answer": "insulation",
        "explanation": "At 23:53 the lecturer says foam was added \"to increase the insulation\".",
        "segment": 0
      },
      {
        "prompt": "• To increase the light, the building has many internal mirrors and _____",
        "kind": "text",
        "answer": "windows",
        "explanation": "At 24:29 the lecturer says light is spread by \"lots of mirrors and windows inside the house\".",
        "segment": 0
      },
      {
        "prompt": "• In future, the house may produce more _____",
        "kind": "text",
        "answer": "electricity",
        "explanation": "At 24:59 the lecturer says the house may \"generate an electricity surplus\" to sell to the grid.",
        "segment": 0
      },
      {
        "prompt": "• Recycled wood was used for the _____",
        "kind": "text",
        "answer": [
          "floor",
          "floors"
        ],
        "explanation": "At 24:59 the lecturer says \"the floors are made of reclaimed wood\".",
        "segment": 0
      },
      {
        "prompt": "• The system for processing domestic _____",
        "kind": "text",
        "answer": "waste",
        "explanation": "At 25:31 the lecturer says household waste \"is dealt with organically\", filtered through reed beds.",
        "segment": 0
      },
      {
        "prompt": "• The use of large quantities of _____",
        "kind": "text",
        "answer": "concrete",
        "explanation": "At 25:59 the lecturer says construction \"had to use massive amounts of concrete\", which harmed the environment.",
        "segment": 0
      },
      {
        "prompt": "• But the house will have paid its ‘environmental debt’ within _____",
        "kind": "text",
        "answer": "15 years",
        "explanation": "At 26:32 the lecturer says the environmental debt \"will only take 15 years\" to clear.",
        "segment": 0
      }
    ]
  },
  "multiple-choice": {
    "title": "Exercise. Choose the correct letter",
    "intro": "Real Part 3 questions from two different IELTS Listening tests.",
    "segments": [
      {
        "src": "/audio/listening/test-003.mp3",
        "startSeconds": 736.39,
        "endSeconds": 1199.24,
        "source": "Listening Test 3, Part 3, Questions 21 to 30",
        "transcriptHtml": "<p class=\"transcript-note\">Automatic transcript. It may contain small recognition errors; the answer key is authoritative.</p><p><span class=\"ts\">[12:16]</span> Now turn to section 3. Section 3. Two overseas students, called Spiroz and Tirocco, have just finished the first semester of their university course. They are discussing with their English language teacher how they coped with the course. First, you have some time to look at questions 21 to 25. Now listen carefully and answer questions 21 to 25.</p><p><span class=\"ts\">[13:16]</span> Before we start, Spiroz and Tirocco, thanks for coming in today to talk about your recent study experiences and congratulations to you both in doing so well in your first semester exams. I&#x27;d like to discuss with you the value of the English for academic purposes course you did here last year before starting your university course. Spiroz, if I could start with you,</p><p><span class=\"ts\">[13:40]</span> what parts of the program have now proved to be particularly valuable to you? I think that having to do a seminar presentation really helped me. For example, a couple of weeks ago in our marketing subject, when it was my turn to give a presentation, I felt quite confident. Of course, I was still nervous but because I had done one before, I knew what to expect. Also,</p><p><span class=\"ts\">[14:06]</span> I know I was well prepared and I had practiced my timing. In fact, I think that in relation to some of the other people in my group, I did quite a good job because my overall style was quite professional. What about you, Hirocco? That&#x27;s interesting. In my group, I was really surprised by the way the students did their presentations. They just read their notes aloud. Can you believe</p><p><span class=\"ts\">[14:32]</span> that? They didn&#x27;t worry about their presentation style or keeping eye contact with their audience. And I remember that these things were really stressed to us in the course here. So how did you approach your presentation, Hirocco? Well, to speak frankly, I read my notes too. At the time, it was a relief to do it this way but</p><p><span class=\"ts\">[14:56]</span> actually when I had finished, I didn&#x27;t feel any real sense of satisfaction. I didn&#x27;t feel positive about the experience at all. That&#x27;s a pity. You know, although I was pleased with my presentation, I am not so pleased with my actual performance right now in e-tutorials. During the whole semester, I&#x27;ve not said anything in our tutorial discussions. Not a word.</p><p><span class=\"ts\">[15:18]</span> Really, Speros? Why is that? Do the other students talk too much? It&#x27;s partly that. But it&#x27;s mostly because I have had no confidence to speak out. Their style of speaking is so different. It&#x27;s not the style we were used to during the course. They use so many colloquialisms. They&#x27;re not very polite and sometimes there seems to be no order in their</p><p><span class=\"ts\">[15:41]</span> discussion. Also, they are very familiar with each other. So because they know each other&#x27;s habits, they can let each other into the discussion. You&#x27;re right, Speros. I have experienced that too. Before you hear the rest of the conversation, you have some time to look at questions 26 to 30. Now listen and answer questions 26 to 30.</p><p><span class=\"ts\">[16:31]</span> For most of the semester, I&#x27;ve said absolutely nothing in tutorials. But recently, I&#x27;ve been trying to speak up more and I just jump in and I&#x27;ve noticed an interesting thing. I&#x27;ve noticed that if they thought my point was interesting or new, then the next time they actually asked for my opinion. And then it was much easier for me to be part of the discussion.</p><p><span class=\"ts\">[16:56]</span> That&#x27;s great, Eroko. I hope that happens for me next semester. I&#x27;ll have to work hard to find some interesting points. What helped you to find these ideas? I think that one thing that helped me with this was the reading. I&#x27;ve had to do so much reading this semester just to help me make sense of the lectures. At first, I couldn&#x27;t understand what the lectures were talking about. So I had to</p><p><span class=\"ts\">[17:21]</span> turn to the books and journals. Every night I read for hours using the lists of references that were given and I made pages of notes. At breakfast I read and read my notes again. This habit has helped me to follow the ideas in the lectures and it&#x27;s also given me some ideas to use in the tutorials. But I did so much reading anyway. I don&#x27;t think there&#x27;s any time</p><p><span class=\"ts\">[17:47]</span> left over for anything extra. My reading speed is still quite slow, though I&#x27;m much better at dealing with vocabulary than I used to be. What else do you think we could add to the course program to help with this reading problem? There&#x27;s not really anything because it&#x27;s my problem. I remember we were given long articles to read. We didn&#x27;t like that, but now I realize that reading</p><p><span class=\"ts\">[18:12]</span> those long articles was good preparation for the things I need to read now. Also, in class, we regularly had speed reading tasks to do and we kept a record of our reading speed so the teachers were encouraging us to work on that. That&#x27;s true sparrows, but what we read could have been different. Sometimes in the English class I felt frustrated when I had to read articles about</p><p><span class=\"ts\">[18:36]</span> the environment or health or education because I wanted to concentrate on my own field, but we didn&#x27;t read anything about engineering. So I think I wasted some time learning vocabulary I didn&#x27;t need. But surely the strategies you were taught for dealing with that vocabulary were helpful? Yes, but psychologically speaking, I would have felt much better working on reading from</p><p><span class=\"ts\">[19:01]</span> my own field. What do you think, Spiroz? Oh, I agree. That would have helped my confidence too, and I would have been more motivated. It was good, though, that we could work on our own topics when we wrote the research assignments. Okay, let&#x27;s move on to writing now. That is the end of section three. You now have half a minute to check your answers.</p>"
      },
      {
        "src": "/audio/listening/test-005.mp3",
        "startSeconds": 724.23,
        "endSeconds": 1125.18,
        "source": "Listening Test 5, Part 3, Questions 21 to 26",
        "transcriptHtml": "<p class=\"transcript-note\">Automatic transcript. It may contain small recognition errors; the answer key is authoritative.</p><p><span class=\"ts\">[12:04]</span> Section Three. You will hear a university tutor and a new student called Paul discussing Paul&#x27;s work experience and Latin American Studies course. First, you have some time to look at questions 21 to 26. Now listen carefully and answer questions 21 to 26.</p><p><span class=\"ts\">[13:17]</span> I&#x27;ve been reading your personal statement, Paul. First, let&#x27;s talk about your work experience in South America. What took you there? Was it to gain more fluency in Spanish? Well, as I&#x27;m combining Spanish with Latin American Studies, my main idea was to find out more about the way people lived there.</p><p><span class=\"ts\">[13:38]</span> My spoken Spanish was already pretty good, in fact. So you weren&#x27;t too worried about language barriers? No. In fact, I ended up teaching English there, although that wasn&#x27;t my original choice of work. I see. How did you find out about all this?</p><p><span class=\"ts\">[13:52]</span> I found an agency that runs all kinds of voluntary projects in South America. What kind of work? Well, there were several possibilities. You mean construction, engineering work?</p><p><span class=\"ts\">[14:02]</span> Yes. Getting involved in building projects was an option. Then there was tourism, taking tourists for walks around the volcanoes, which I actually chose to do. And then there was work with local farmers. But you didn&#x27;t continue with that project. Why not?</p><p><span class=\"ts\">[14:19]</span> Because I never really knew whether I&#x27;d be needed or not. I&#x27;d thought it might be difficult physically, but I was certainly fit enough. Now, I wanted to do something that had more of a proper structure to it, I suppose. I get demotivated otherwise.</p><p><span class=\"ts\">[14:33]</span> What do you think you learned from your experience? It must have been a great opportunity to examine community life. Yes, but it was difficult at first to be accepted by the locals. It was a very remote village, and some of them were reluctant to speak to me.</p><p><span class=\"ts\">[14:47]</span> Although they were always interested in my clothes and how much I had to pay for them. Well, that&#x27;s understandable. Yes. But things soon improved. What struck me was that when people became more comfortable with me and less suspicious,</p><p><span class=\"ts\">[15:00]</span> we really connected with each other in a meaningful way. You made good friends? Yes, with two of the families in particular. Good. What about management? Did you have a project manager?</p><p><span class=\"ts\">[15:10]</span> Yes, and he gave me lots of advice and guidance. And was he good at managing too? That wasn&#x27;t his strong point. I think he was often more interested in the academic side of things than filing reports.</p><p><span class=\"ts\">[15:24]</span> He was a bit of a dreamer. And did you have a contract? I had to stay for a minimum of three months. My parents were surprised when I asked to stay longer, six months in the end.</p><p><span class=\"ts\">[15:35]</span> I was so happy there. And did anything on the administration side of things surprise you? What was the food and lodging like? Simple. But there was plenty to eat, and I only paid seven dollars a day for that, which was amazing, really.</p><p><span class=\"ts\">[15:48]</span> And they gave me all the equipment I needed, even a laptop. You didn&#x27;t expect that then? No. Well, I&#x27;ll look forward to hearing more.</p><p><span class=\"ts\">[16:00]</span> Before you hear the rest of the discussion, you have some time to look at questions 27 to 30. Now listen and answer questions 27 to 30. But now let&#x27;s look at these modules. You&#x27;ll need to start thinking about which ones you&#x27;ll definitely want to study.</p><p><span class=\"ts\">[16:40]</span> The first one here is gender studies in Latin America. It looks at how gender analysis is reconfiguring civil society in Latin America. Women are increasingly occupying positions in government and in other elected leadership positions in Latin America. I think you&#x27;d find it interesting.</p><p><span class=\"ts\">[16:58]</span> If it was to do with people in the villages rather than those in the public sphere, I would. Okay. What about second language acquisition? Do you think I&#x27;d find that useful? Well, you&#x27;ve had some practical experience in the field. I think it would be.</p><p><span class=\"ts\">[17:12]</span> I hadn&#x27;t thought about that. I&#x27;ll put that down as a definite then. Okay. What about indigenous women&#x27;s lives? That sounds appropriate. I thought so too, but I looked at last year&#x27;s exam questions and that changed my mind. Don&#x27;t judge the value of the course on that.</p><p><span class=\"ts\">[17:29]</span> Maybe talk to some other students first and we can talk about it again later. Okay. Yes. And lastly, will you sign up for Portuguese lessons? My Spanish is good, so would I find that modulese?</p><p><span class=\"ts\">[17:42]</span> Not necessarily. Some people find that Spanish interferes with learning Portuguese, getting the accent right too. It&#x27;s quite different in a lot of ways. Well, I&#x27;d much sooner do something else then. Alright. Now, what we need to do is make-</p><p><span class=\"ts\">[18:01]</span> That is the end of section three. You now have half a minute to check your answers. Now turn to section four.</p>"
      }
    ],
    "questions": [
      {
        "prompt": "One reason why Spiros felt happy about his marketing presentation was that",
        "kind": "choice",
        "options": [
          {
            "value": "A",
            "label": "A) he was not nervous"
          },
          {
            "value": "B",
            "label": "B) his style was good"
          },
          {
            "value": "C",
            "label": "C) the presentation was the best in his group"
          }
        ],
        "answer": "B",
        "explanation": "At 14:06 Spiros says he did \"quite a good job because my overall style was quite professional\".",
        "segment": 0
      },
      {
        "prompt": "What surprised Hiroko about the other students’ presentations?",
        "kind": "choice",
        "options": [
          {
            "value": "A",
            "label": "A) Their presentations were not interesting"
          },
          {
            "value": "B",
            "label": "B) They found their presentations stressful"
          },
          {
            "value": "C",
            "label": "C) They didn’t look at the audience enough"
          }
        ],
        "answer": "C",
        "explanation": "At 14:32 Hiroko is surprised the others \"didn't worry about their presentation style or keeping eye contact with their audience\".",
        "segment": 0
      },
      {
        "prompt": "After she gave her presentation, Hiroko felt",
        "kind": "choice",
        "options": [
          {
            "value": "A",
            "label": "A) delighted"
          },
          {
            "value": "B",
            "label": "B) dissatisfied"
          },
          {
            "value": "C",
            "label": "C) embarrassed"
          }
        ],
        "answer": "B",
        "explanation": "At 14:56 Hiroko says after her presentation \"I didn't feel any real sense of satisfaction\".",
        "segment": 0
      },
      {
        "prompt": "How does Spiros feel about his performance in tutorials?",
        "kind": "choice",
        "options": [
          {
            "value": "A",
            "label": "A) not very happy"
          },
          {
            "value": "B",
            "label": "B) really pleased"
          },
          {
            "value": "C",
            "label": "C) fairly confident"
          }
        ],
        "answer": "A",
        "explanation": "At 14:56 Spiros says \"I am not so pleased with my actual performance right now in tutorials\".",
        "segment": 0
      },
      {
        "prompt": "Why can the other students participate so easily in discussions?",
        "kind": "choice",
        "options": [
          {
            "value": "A",
            "label": "A) They are polite to each other"
          },
          {
            "value": "B",
            "label": "B) They agree to take turns in speaking"
          },
          {
            "value": "C",
            "label": "C) They know each other well"
          }
        ],
        "answer": "C",
        "explanation": "At 15:18 Spiros says the other students \"are very familiar with each other\", so they let each other into discussion.",
        "segment": 0
      },
      {
        "prompt": "Why is Hiroko feeling more positive about tutorials now?",
        "kind": "choice",
        "options": [
          {
            "value": "A",
            "label": "A) She finds the other students’ opinions more interesting"
          },
          {
            "value": "B",
            "label": "B) She is making more of a contribution"
          },
          {
            "value": "C",
            "label": "C) The tutor includes her in the discussion"
          }
        ],
        "answer": "B",
        "explanation": "At 16:31 Hiroko says she has \"been trying to speak up more and I just jump in\".",
        "segment": 0
      },
      {
        "prompt": "To help her understand lectures, Hiroko",
        "kind": "choice",
        "options": [
          {
            "value": "A",
            "label": "A) consulted reference materials"
          },
          {
            "value": "B",
            "label": "B) had extra tutorials with her lecturers"
          },
          {
            "value": "C",
            "label": "C) borrowed lecture notes from other students"
          }
        ],
        "answer": "A",
        "explanation": "At 16:56 Hiroko says she had \"to turn to the books and journals\" to understand lectures.",
        "segment": 0
      },
      {
        "prompt": "What does Spiros think of his reading skills?",
        "kind": "choice",
        "options": [
          {
            "value": "A",
            "label": "A) He reads faster than he used to"
          },
          {
            "value": "B",
            "label": "B) It still takes him a long time to read"
          },
          {
            "value": "C",
            "label": "C) He tends to struggle with new vocabulary"
          }
        ],
        "answer": "B",
        "explanation": "At 17:21 Spiros says \"my reading speed is still quite slow\".",
        "segment": 0
      },
      {
        "prompt": "What is Hiroko’s subject area?",
        "kind": "choice",
        "options": [
          {
            "value": "A",
            "label": "A) environmental studies"
          },
          {
            "value": "B",
            "label": "B) health education"
          },
          {
            "value": "C",
            "label": "C) engineering"
          }
        ],
        "answer": "C",
        "explanation": "At 18:12 Hiroko says \"we didn't read anything about engineering\", her own subject.",
        "segment": 0
      },
      {
        "prompt": "Hiroko thinks that in the reading classes the students should",
        "kind": "choice",
        "options": [
          {
            "value": "A",
            "label": "A) learn more vocabulary"
          },
          {
            "value": "B",
            "label": "B) read more in their own subject areas"
          },
          {
            "value": "C",
            "label": "C) develop better reading strategies"
          }
        ],
        "answer": "B",
        "explanation": "At 19:01 Hiroko says she would have felt better \"working on reading from my own field\".",
        "segment": 0
      },
      {
        "prompt": "Paul decided to get work experience in South America because he wanted",
        "kind": "choice",
        "options": [
          {
            "value": "A",
            "label": "A) to teach English there"
          },
          {
            "value": "B",
            "label": "B) to improve his Spanish"
          },
          {
            "value": "C",
            "label": "C) to learn about Latin American life"
          }
        ],
        "answer": "C",
        "explanation": "At 13:17 Paul's main idea was \"to find out more about the way people lived there\".",
        "segment": 1
      },
      {
        "prompt": "What project work did Paul originally intend to get involved in?",
        "kind": "choice",
        "options": [
          {
            "value": "A",
            "label": "A) construction"
          },
          {
            "value": "B",
            "label": "B) agriculture"
          },
          {
            "value": "C",
            "label": "C) tourism"
          }
        ],
        "answer": "C",
        "explanation": "At 14:02 he chose \"tourism, taking tourists for walks around the volcanoes\".",
        "segment": 1
      },
      {
        "prompt": "Why did Paul change from one project to another?",
        "kind": "choice",
        "options": [
          {
            "value": "A",
            "label": "A) His first job was not well organized"
          },
          {
            "value": "B",
            "label": "B) He found doing the routine work very boring"
          },
          {
            "value": "C",
            "label": "C) The work was too physically demanding"
          }
        ],
        "answer": "A",
        "explanation": "At 14:19 he says of the farm project \"I never really knew whether I'd be needed or not\", wanting \"more of a proper structure\".",
        "segment": 1
      },
      {
        "prompt": "In the village community, he learnt how important it was to",
        "kind": "choice",
        "options": [
          {
            "value": "A",
            "label": "A) respect family life"
          },
          {
            "value": "B",
            "label": "B) develop trust"
          },
          {
            "value": "C",
            "label": "C) use money wisely"
          }
        ],
        "answer": "B",
        "explanation": "At 15:00 he says once villagers grew \"less suspicious, we really connected with each other in a meaningful way\", i.e. trust.",
        "segment": 1
      },
      {
        "prompt": "What does Paul say about his project manager?",
        "kind": "choice",
        "options": [
          {
            "value": "A",
            "label": "A) He let Paul do most of the work"
          },
          {
            "value": "B",
            "label": "B) His plans were too ambitious"
          },
          {
            "value": "C",
            "label": "C) He was very supportive of Paul"
          }
        ],
        "answer": "C",
        "explanation": "At 15:10 his manager \"gave me lots of advice and guidance\".",
        "segment": 1
      },
      {
        "prompt": "Paul was surprised to be given",
        "kind": "choice",
        "options": [
          {
            "value": "A",
            "label": "A) a computer to use"
          },
          {
            "value": "B",
            "label": "B) so little money to live on"
          },
          {
            "value": "C",
            "label": "C) an extension to his contract"
          }
        ],
        "answer": "A",
        "explanation": "At 15:48 he says \"they gave me all the equipment I needed, even a laptop\", which surprised him.",
        "segment": 1
      }
    ]
  },
  "matching": {
    "title": "Exercise. Match each item to the correct answer",
    "intro": "Real questions from two different IELTS Listening tests. Some options in each list are not used.",
    "segments": [
      {
        "src": "/audio/listening/test-004.mp3",
        "startSeconds": 1081.85,
        "endSeconds": 1494.96,
        "source": "Listening Test 4, Part 4, Questions 31 to 36",
        "transcriptHtml": "<p class=\"transcript-note\">Automatic transcript. It may contain small recognition errors; the answer key is authoritative.</p><p><span class=\"ts\">[18:01]</span> Section four. You will hear a lecturer giving a talk about Australian rock art to a group of archaeology students. First, you have some time to look at questions 31 to 40. Now listen carefully and answer questions 31 to 40.</p><p><span class=\"ts\">[19:21]</span> Good morning, everyone. I&#x27;ve been invited to talk about my research project into Australian Aboriginal rock paintings. The Australian Aborigines have recorded both real and symbolic images of their time on rock walls for many thousands of years. Throughout the long history of this tradition, new images have appeared and new painting styles have developed.</p><p><span class=\"ts\">[19:43]</span> And these characteristics can be used to categorize the different artistic styles. Among these are what we call the dynamic, yam and modern styles of painting. One of the most significant characteristics of the different styles is the way that humans are depicted in the paintings. The more recent paintings show people in static poses.</p><p><span class=\"ts\">[20:06]</span> But the first human images to dominate rock art paintings over 8,000 years ago were full of movement. These paintings showed people hunting and cooking food, and so they were given the name dynamic to reflect this energy. It&#x27;s quite amazing considering they were painted in such a simple stick-like form. In the yam period, there was a movement away from stick figures to a more naturalistic shape.</p><p><span class=\"ts\">[20:32]</span> However, they didn&#x27;t go as far as the modern style, which is known as X-ray because it actually makes a feature of the internal skeleton as well as the organs of animals and humans. The yam style of painting got its name from the fact that it featured much curvier figures that actually resemble the vegetable called the yam, which is similar to a sweet potato. The modern paintings are interesting because they include paintings at the time of the first contact with European settlers. Aborigines managed to convey the idea of the settlers clothing by simply painting the Europeans without any hands, indicating the habit of standing with their hands in their pockets.</p><p><span class=\"ts\">[21:13]</span> Size is another characteristic. The more recent images tend to be life-size or even larger, but the dynamic figures are painted in miniature. Aboriginal rock art also records the environmental changes that occurred over thousands of years. For example, we know from the dynamic paintings that over 8,000 years ago, Aborigines would have rarely eaten fish and sea levels were much lower at this time. In fact, fish didn&#x27;t start to appear in paintings until the yam period, along with shells and other marine images.</p><p><span class=\"ts\">[21:49]</span> The paintings of the yam tradition also suggest that during this time, the Aborigines moved away from animals as their main food source and began including vegetables in their diet as these feature prominently. Fresh water creatures didn&#x27;t appear in the paintings until the modern period from 4,000 years ago, so these paintings have already taught us a lot. But one image that has always intrigued us is known as the rainbow serpent. The rainbow serpent, which is the focus of my most recent project, gets its name from its snake or serpent-like body and it first appeared in the yam period 4 to 6,000 years ago.</p><p><span class=\"ts\">[22:35]</span> Many believe it is a curious mixture of kangaroo, snake and crocodile. But we decided to study the rainbow serpent paintings to see if we could locate the animal that the very first painters base their image on. The yam period coincided with the end of the last ice age. This brought about tremendous change in the environment with the sea levels rising and creeping steadily inland.</p><p><span class=\"ts\">[23:00]</span> This flooded many familiar land features and also caused a great deal of disruption to traditional patterns of life, hunting in particular. New shores were formed and totally different creatures would have washed up onto the shores. We studied 107 paintings of the rainbow serpent and found that the one creature that matches it most closely was the ribboned pipefish, which is a type of seahorse. This sea creature would have been a totally unfamiliar sight in the inland regions where the image is found and may have been the inspiration behind the early paintings.</p><p><span class=\"ts\">[23:37]</span> So, at the end of the ice age there would have been enormous changes in animal and plant life. It&#x27;s not surprising then that the aborigines linked this abundance to the new creatures they witnessed. Even today, aborigines see the rainbow serpent as a symbol of creation, which is understandable given the increase in vegetation and the new life forms that featured when the image first appeared. That is the end of section 4.</p><p><span class=\"ts\">[24:09]</span> You now have half a minute to check your answers. That is the end of the listening test. In the IELTS test you would now have 10 minutes to transfer your answers to the answer sheet.</p>"
      },
      {
        "src": "/audio/listening/test-014.mp3",
        "startSeconds": 394.32,
        "endSeconds": 758.35,
        "source": "Listening Test 14, Part 2, Questions 11 to 16",
        "transcriptHtml": "<p class=\"transcript-note\">Automatic transcript. It may contain small recognition errors; the answer key is authoritative.</p><p><span class=\"ts\">[06:34]</span> Now turn to section two, section two. You will hear a man who owns a holiday home talking on the phone to a woman who has rented it. First, you have some time to look at questions 11 to 16. Now listen carefully and answer questions 11 to 16.</p><p><span class=\"ts\">[07:18]</span> Hello, Ron Smith speaking. Hi, this is Kayla Lawton. I signed up with the Holiday House Agency to rent your beach house. But the agent isn&#x27;t available today and I have a problem. I can&#x27;t remember what she said about the alarm system.</p><p><span class=\"ts\">[07:33]</span> Oh, it&#x27;s quite simple really. The main thing to remember is to enter by the back door, which leads into the kitchen, because that is where the alarm is situated, right next to the light switch just beside the door. If you go through the front door into the living room,</p><p><span class=\"ts\">[07:50]</span> it will take you longer to reach the alarm and you only have a few seconds to deactivate it. The code is 3498. Okay, I&#x27;ve got that. The agent will have given you the back and front door keys,</p><p><span class=\"ts\">[08:05]</span> but there are other keys that you may need for the garage, the laundry and the little garden shed. You&#x27;ll find them hanging on a hook inside the cupboard in the hallway, next to the hot water cupboard. The laundry room is outside, next to the garage. It should be kept locked,</p><p><span class=\"ts\">[08:24]</span> so please remember to return the key to the hook when you&#x27;ve done your washing. The last tenant lost it somewhere in the garden and I had to have the lock replaced. There should be some laundry detergent for the washing machine next to the dishwashing liquid under the kitchen sink.</p><p><span class=\"ts\">[08:41]</span> Oh, now about the linen. The sheets are already on the beds and there are lots of towels at the house too. Of course, you&#x27;ll want to enjoy that lovely safe swimming beach as much as possible. You&#x27;ll find a pile of beach towels in a basket on the washing machine.</p><p><span class=\"ts\">[08:58]</span> Feel free to take these to the beach with you. We have lots of them and they&#x27;re pretty old, so it doesn&#x27;t matter if they get a bit dirty or sandy. There are other newer towels for use in the bathroom only.</p><p><span class=\"ts\">[09:11]</span> These are in the hot water cupboard on the shelf up above the cylinder. Please don&#x27;t take these ones down to the beach. Ah, what else? Oh yes, I should tell you that the electricity supply is generally reliable,</p><p><span class=\"ts\">[09:28]</span> but sometimes there are power surges which make a few light bulbs blow. If that happens, don&#x27;t worry. There are spare light bulbs in a shoe box on the chest of drawers in the bedroom. That reminds me the main power supply is switched off at the mains box,</p><p><span class=\"ts\">[09:44]</span> which is above the front door. The first thing to do when you arrive is to pull down the large lever. It&#x27;s clearly labeled mains switch. You don&#x27;t need to touch any of the other switches.</p><p><span class=\"ts\">[09:56]</span> Thank you. Anything else? Before you hear the rest of the conversation, you have some time to look at questions 17 to 20. Now listen and answer questions 17 to 20.</p><p><span class=\"ts\">[10:33]</span> Oh, one more thing, something that might interest you as a folder of local information. You know the sort of thing, interesting places to visit, opening hours for the shops and services in the town, plus a little map of local walks.</p><p><span class=\"ts\">[10:48]</span> It&#x27;s on top of the TV along with the remote control. Parking in the town is usually really easy, except for weekends when the place is swamped with tourists. So I would recommend doing your shopping on weekdays.</p><p><span class=\"ts\">[11:02]</span> Oh, one thing though, if you want to combine a shopping expedition with a visit to the Early History Museum, you should know that it&#x27;s not open on Mondays.</p><p><span class=\"ts\">[11:12]</span> There are lots of good places to eat in town too. You&#x27;ll find a list of menus and takeaway prices for some of the more popular local cafes and restaurants. If you like Chinese, the Happy Dragon has excellent food,</p><p><span class=\"ts\">[11:26]</span> or I&#x27;d recommend the pizzeria if you prefer Italian. They have a good selection of takeaway pasta and pizza as well. The Happy Dragon is a firm favourite with the locals though. Both restaurants deliver free of charge,</p><p><span class=\"ts\">[11:40]</span> but note the phone numbers have changed since the menus were printed. Phone 3231190 for pizza, and 323911 for Chinese. You won&#x27;t be disappointed.</p><p><span class=\"ts\">[11:54]</span> Thanks a lot, I&#x27;ll do that. That is the end of section two. You now have half a minute to check your answers. Now turn to section three.</p>"
      }
    ],
    "questions": [
      {
        "prompt": "figures revealing bones",
        "kind": "select",
        "options": [
          {
            "value": "A",
            "label": "A) Dynamic"
          },
          {
            "value": "B",
            "label": "B) Yam"
          },
          {
            "value": "C",
            "label": "C) Modern"
          }
        ],
        "answer": "C",
        "explanation": "At 20:32 the modern \"X-ray\" style \"makes a feature of the internal skeleton\", i.e. bones.",
        "segment": 0
      },
      {
        "prompt": "rounded figures",
        "kind": "select",
        "options": [
          {
            "value": "A",
            "label": "A) Dynamic"
          },
          {
            "value": "B",
            "label": "B) Yam"
          },
          {
            "value": "C",
            "label": "C) Modern"
          }
        ],
        "answer": "B",
        "explanation": "At 20:32 the yam style \"featured much curvier figures\" resembling the vegetable, i.e. rounded.",
        "segment": 0
      },
      {
        "prompt": "figures with parts missing",
        "kind": "select",
        "options": [
          {
            "value": "A",
            "label": "A) Dynamic"
          },
          {
            "value": "B",
            "label": "B) Yam"
          },
          {
            "value": "C",
            "label": "C) Modern"
          }
        ],
        "answer": "C",
        "explanation": "At 20:32 modern paintings show Europeans \"without any hands\", i.e. parts missing.",
        "segment": 0
      },
      {
        "prompt": "figures smaller than life size",
        "kind": "select",
        "options": [
          {
            "value": "A",
            "label": "A) Dynamic"
          },
          {
            "value": "B",
            "label": "B) Yam"
          },
          {
            "value": "C",
            "label": "C) Modern"
          }
        ],
        "answer": "A",
        "explanation": "At 21:13 \"the dynamic figures are painted in miniature\", smaller than life size.",
        "segment": 0
      },
      {
        "prompt": "sea creatures",
        "kind": "select",
        "options": [
          {
            "value": "A",
            "label": "A) Dynamic"
          },
          {
            "value": "B",
            "label": "B) Yam"
          },
          {
            "value": "C",
            "label": "C) Modern"
          }
        ],
        "answer": "B",
        "explanation": "At 21:13 \"fish didn't start to appear in paintings until the yam period\", i.e. sea creatures.",
        "segment": 0
      },
      {
        "prompt": "plants Painting Styles",
        "kind": "select",
        "options": [
          {
            "value": "A",
            "label": "A) Dynamic"
          },
          {
            "value": "B",
            "label": "B) Yam"
          },
          {
            "value": "C",
            "label": "C) Modern"
          }
        ],
        "answer": "B",
        "explanation": "At 21:49 in the yam tradition Aborigines began \"including vegetables in their diet as these feature prominently\", i.e. plants.",
        "segment": 0
      },
      {
        "prompt": "Alarm",
        "kind": "select",
        "options": [
          {
            "value": "A",
            "label": "A) on washing machine"
          },
          {
            "value": "B",
            "label": "B) in hallway cupboard"
          },
          {
            "value": "C",
            "label": "C) in hot water cupboard"
          },
          {
            "value": "D",
            "label": "D) next to back door"
          },
          {
            "value": "E",
            "label": "E) in bathroom"
          },
          {
            "value": "F",
            "label": "F) on top of television"
          },
          {
            "value": "G",
            "label": "G) in bedroom"
          },
          {
            "value": "H",
            "label": "H) under kitchen sink"
          },
          {
            "value": "I",
            "label": "I) above front door"
          }
        ],
        "answer": "D",
        "explanation": "At 07:50 Ron says the alarm is right by the back door, next to the light switch.",
        "segment": 1
      },
      {
        "prompt": "Garage key",
        "kind": "select",
        "options": [
          {
            "value": "A",
            "label": "A) on washing machine"
          },
          {
            "value": "B",
            "label": "B) in hallway cupboard"
          },
          {
            "value": "C",
            "label": "C) in hot water cupboard"
          },
          {
            "value": "D",
            "label": "D) next to back door"
          },
          {
            "value": "E",
            "label": "E) in bathroom"
          },
          {
            "value": "F",
            "label": "F) on top of television"
          },
          {
            "value": "G",
            "label": "G) in bedroom"
          },
          {
            "value": "H",
            "label": "H) under kitchen sink"
          },
          {
            "value": "I",
            "label": "I) above front door"
          }
        ],
        "answer": "B",
        "explanation": "At 08:05 Ron says extra keys, including the garage key, hang in the hallway cupboard.",
        "segment": 1
      },
      {
        "prompt": "Laundry detergent",
        "kind": "select",
        "options": [
          {
            "value": "A",
            "label": "A) on washing machine"
          },
          {
            "value": "B",
            "label": "B) in hallway cupboard"
          },
          {
            "value": "C",
            "label": "C) in hot water cupboard"
          },
          {
            "value": "D",
            "label": "D) next to back door"
          },
          {
            "value": "E",
            "label": "E) in bathroom"
          },
          {
            "value": "F",
            "label": "F) on top of television"
          },
          {
            "value": "G",
            "label": "G) in bedroom"
          },
          {
            "value": "H",
            "label": "H) under kitchen sink"
          },
          {
            "value": "I",
            "label": "I) above front door"
          }
        ],
        "answer": "H",
        "explanation": "At 08:41 Ron says the laundry detergent is kept under the kitchen sink.",
        "segment": 1
      },
      {
        "prompt": "Beach towels",
        "kind": "select",
        "options": [
          {
            "value": "A",
            "label": "A) on washing machine"
          },
          {
            "value": "B",
            "label": "B) in hallway cupboard"
          },
          {
            "value": "C",
            "label": "C) in hot water cupboard"
          },
          {
            "value": "D",
            "label": "D) next to back door"
          },
          {
            "value": "E",
            "label": "E) in bathroom"
          },
          {
            "value": "F",
            "label": "F) on top of television"
          },
          {
            "value": "G",
            "label": "G) in bedroom"
          },
          {
            "value": "H",
            "label": "H) under kitchen sink"
          },
          {
            "value": "I",
            "label": "I) above front door"
          }
        ],
        "answer": "A",
        "explanation": "At 08:58 Ron says beach towels sit in a basket on top of the washing machine.",
        "segment": 1
      },
      {
        "prompt": "Bath towels",
        "kind": "select",
        "options": [
          {
            "value": "A",
            "label": "A) on washing machine"
          },
          {
            "value": "B",
            "label": "B) in hallway cupboard"
          },
          {
            "value": "C",
            "label": "C) in hot water cupboard"
          },
          {
            "value": "D",
            "label": "D) next to back door"
          },
          {
            "value": "E",
            "label": "E) in bathroom"
          },
          {
            "value": "F",
            "label": "F) on top of television"
          },
          {
            "value": "G",
            "label": "G) in bedroom"
          },
          {
            "value": "H",
            "label": "H) under kitchen sink"
          },
          {
            "value": "I",
            "label": "I) above front door"
          }
        ],
        "answer": "C",
        "explanation": "At 09:11 Ron says the newer bath towels are kept in the hot water cupboard.",
        "segment": 1
      },
      {
        "prompt": "Light bulbs",
        "kind": "select",
        "options": [
          {
            "value": "A",
            "label": "A) on washing machine"
          },
          {
            "value": "B",
            "label": "B) in hallway cupboard"
          },
          {
            "value": "C",
            "label": "C) in hot water cupboard"
          },
          {
            "value": "D",
            "label": "D) next to back door"
          },
          {
            "value": "E",
            "label": "E) in bathroom"
          },
          {
            "value": "F",
            "label": "F) on top of television"
          },
          {
            "value": "G",
            "label": "G) in bedroom"
          },
          {
            "value": "H",
            "label": "H) under kitchen sink"
          },
          {
            "value": "I",
            "label": "I) above front door"
          }
        ],
        "answer": "G",
        "explanation": "At 09:28 Ron says spare light bulbs are kept in the bedroom.",
        "segment": 1
      }
    ]
  },
  "map-labelling": {
    "title": "Exercise. Label the map, plan or diagram",
    "intro": "Real questions from two different IELTS Listening tests. Use the picture to work out where each answer is.",
    "segments": [
      {
        "src": "/audio/listening/test-012.mp3",
        "startSeconds": 1323.89,
        "endSeconds": 1713.98,
        "source": "Listening Test 12, Part 4, Questions 31 to 34",
        "transcriptHtml": "<p class=\"transcript-note\">Automatic transcript. It may contain small recognition errors; the answer key is authoritative.</p><p><span class=\"ts\">[22:03]</span> Section four. You will hear a lecturer giving a talk on cochlear implants. First, you have some time to look at questions 31 to 40. Now listen carefully and answer questions 31 to 40.</p><p><span class=\"ts\">[23:05]</span> The topic for today&#x27;s lecture is cochlear implants, which are a relatively new form of technology for assisting people who are profoundly deaf. First, let&#x27;s revise how normal hearing works. If you look at image one, you will remember that the ear has three sections.</p><p><span class=\"ts\">[23:22]</span> The outer ear or pinna picks up sounds, which are then channeled through the ear canal to the eardrum, where they are transformed into mechanical vibrations. These are sent to the cochlea or inner ear. Inside this snail-shaped tube, there are sensory hearing cells that have a variety of functions.</p><p><span class=\"ts\">[23:43]</span> The outer hair cells make soft sounds louder and reduce the volume of louder sounds. The inner ear cells transfer this information to the auditory nerve and then to the brain, which interprets the input as sounds. This sophisticated and sensitive process allows us to process a huge variety of auditory input.</p><p><span class=\"ts\">[24:06]</span> For those who are profoundly deaf, the system functions poorly or not at all, and the brain does not receive the input it needs to process and interpret sounds. Image two shows how a cochlear implant works. You can see that the implant has three main parts.</p><p><span class=\"ts\">[24:25]</span> The first external part behind the ear itself is the microphone, and at the back of this, you can see its associated speech processor, which is a tiny computer. This analyzes and digitizes sounds and sends them to the transmitter, which is worn on the head.</p><p><span class=\"ts\">[24:43]</span> Those sounds need to be converted into electrical impulses so that they can be sent to the cochlea. If you look carefully at the image, you can see that just under the skin, directly behind the transmitter, is a surgically implanted receiver. This receives the sounds from the transmitter.</p><p><span class=\"ts\">[25:02]</span> It converts these sounds into electrical impulses, which are sent directly to an electrode array that is implanted inside the cochlea itself, thus completely bypassing the ear canal. As you have seen, a cochlear implant does not operate in the same way as the ear, nor in fact as a hearing aid.</p><p><span class=\"ts\">[25:24]</span> In cases of mild hearing loss, hearing aids can be very helpful. They simply amplify the normal sound waves as they travel down the ear canal. However, they generally cannot overcome severe hearing difficulties, and this is where cochlear implants come into play.</p><p><span class=\"ts\">[25:42]</span> So, what are the pros and cons of using a cochlear implant? Well, firstly, cochlear implants can deliver significant improvements in hearing for some users, and some people report dramatic improvements in the perception of individual words and sentences over the weeks and months after an implant.</p><p><span class=\"ts\">[26:02]</span> However, a cochlear implant is not a magic bullet that works equally well for all users. The sound signals that the brain receives from an implant are quite different from normal ones, and this means that the user has to relearn how to hear. Many users report that speech sounds robotic after a cochlear implant, and the degree to</p><p><span class=\"ts\">[26:24]</span> which people can adjust to this new kind of hearing varies hugely with each user and situation. It is important to understand that a cochlear implant is not a cure for deafness and that the user is still deaf, especially for a child, an implant is a long-term commitment, involving lengthy and intensive training.</p><p><span class=\"ts\">[26:45]</span> The user must learn to reinterpret sounds and will likely need to augment this with speech therapy so that people in the community can easily communicate with them. The implants work much better in quiet situations than in noisy ones, so they still need to learn to lip-read and to use sign language.</p><p><span class=\"ts\">[27:05]</span> The surgery itself is not without risk, though it has greatly improved since it was first performed, and there is some possibility of damage to facial nerves. Another disadvantage of a cochlear implant is that the surgery may remove any natural hearing that the deaf person still retains.</p><p><span class=\"ts\">[27:25]</span> This takes away the possibility of using a hearing aid should the implant not be effective. For this reason, many users have implant surgery performed on only one ear, the one with the least natural hearing. So, who is best suited to receiving an implant?</p><p><span class=\"ts\">[27:44]</span> Many factors impact on this decision. The most significant one appears to be the duration of the deafness, and as you would expect, those who have been deaf for a long time generally have lower success rates. The second related factor is how old the patient was when they became deaf, and maybe</p><p><span class=\"ts\">[28:03]</span> more significantly whether they had learned to speak before they became deaf. Those who become deaf post-lingually generally have better outcomes. Another factor is the health and structure of the cochlea, and how many nerve cells the user retains.</p><p><span class=\"ts\">[28:20]</span> This is related to the cause of the hearing loss, and recent research is exploring how the spinal ganglion or nerve cells are affected by disease. That is the end of section 4.</p>",
        "images": [
          {
            "src": "/pics/listening/imported/test-012.png",
            "alt": "Diagram for Listening Test 12, Part 4, Questions 31 to 34"
          }
        ]
      },
      {
        "src": "/audio/listening/test-008.mp3",
        "startSeconds": 329.3,
        "endSeconds": 712.44,
        "source": "Listening Test 8, Part 2, Questions 15 to 17",
        "transcriptHtml": "<p class=\"transcript-note\">Automatic transcript. It may contain small recognition errors; the answer key is authoritative.</p><p><span class=\"ts\">[05:29]</span> have half a minute to check your answers. Now turn to section two. Section two. You will hear a guide giving a tour of a park. First, you have some time to look at questions 11 to 14. Now listen carefully and answer questions 11 to 14. Welcome to all of you. Can everybody see and hear me? Good. I&#x27;m Sally, your guide for this tour of the Bicentennial Park. I hope that you&#x27;re all</p><p><span class=\"ts\">[07:09]</span> wearing your most comfortable shoes and that you can keep up the pace. So let&#x27;s get underway on our tour around this wonderful park. I&#x27;ll start today with some general background information. There used to be a lot of factories in this area until the 1960s. Creating the park required the demolition of lots of derelict buildings on the site. So most of the exciting park space all around you</p><p><span class=\"ts\">[07:35]</span> was originally warehouses and storehouses. The idea of building a public park here was first discussed when a property developer proposed a high-rise housing development, but the local community wasn&#x27;t happy. If the land was to be cleaned up, they wanted to use the site for recreation. Residents wanted open space for outdoor activities rather than housing or even an indoor sports</p><p><span class=\"ts\">[08:02]</span> complex. Now, to the Bicentennial Park itself, it has two areas, a nature reserve and a formal park with man-made features and gardens. The tall blue and white building in front of us is called the Tower and is the centre point for the formal gardens. It stands 12 metres high, so follow me up the stairs to where we can take advantage of the fantastic views. Before you hear the rest of</p><p><span class=\"ts\">[08:35]</span> the tour, you have some time to look at questions 15 to 20. Now listen and answer questions 15 to 20. Well, here we are at the top of the tower and we&#x27;re going to look at the view from each direction out to the east. The large buildings about a kilometre away are on the Olympic site. There&#x27;s an indoor arena for gymnastics, a stadium, a track and field and a swimming pool for races and</p><p><span class=\"ts\">[09:39]</span> synchronised swimming and also diving. If you look carefully down there, you can see the train lines. The Olympic site has its own station to encourage the use of public transport. There is also a car park but it only holds a limited number of cars. The formal park has some specially created water features. If you look out here to the south, you can see a circular ornamental pond</p><p><span class=\"ts\">[10:06]</span> and around to the west you can relax and sit on a bench to smell the flowers and the rose garden and finally up to the north. If you look in front of you now, there&#x27;s a lake with a small island in the centre. You can hire rowing boats at the boat shed which you can&#x27;t see from here but if you look through the trees, you can see the cafe which has lovely views across the water. Okay,</p><p><span class=\"ts\">[10:32]</span> let&#x27;s climb down now. We will go now and have a look at the nature reserve section of the park which has opened up natural wetland to the public. The mangroves have been made more accessible to visitors by the boardwalk built during the park&#x27;s upgrade. You&#x27;d think that people would come here to look at the unusual plant life of the area but in fact it&#x27;s more often used for cycling and</p><p><span class=\"ts\">[10:55]</span> is very popular with the local clubs. This is the far end of the park and over there you can see the frog pond, a natural feature here long before the park was designed. Just next to it we have our outdoor classroom, a favourite spot for school parties. The area is now most often used by primary schools for biology lessons. And finally let&#x27;s pass by the waterbird refuge. This area is in a</p><p><span class=\"ts\">[11:22]</span> sheltered part of the estuary. That&#x27;s why the park&#x27;s viewing shelter is a favourite spot for bird watchers who can use it to spy through binoculars. You can watch a variety of waterbirds but most visitors expect to see black swans when they come to the shelter. You might spot one yourself right now. Well here we are back at our starting point, the visitors. That is the end of section</p>",
        "images": [
          {
            "src": "/pics/listening/imported/test-008.png",
            "alt": "Diagram for Listening Test 8, Part 2, Questions 15 to 17"
          }
        ]
      }
    ],
    "questions": [
      {
        "prompt": "Label point (31) on the diagram above.",
        "kind": "text",
        "answer": "ear drum",
        "explanation": "At 23:22 the lecturer describes sound reaching the eardrum, labelled in image one.",
        "segment": 0
      },
      {
        "prompt": "Label point (32) on the diagram above.",
        "kind": "text",
        "answer": "auditory nerve",
        "explanation": "At 23:43 the lecturer says the inner ear cells pass signals on to the auditory nerve.",
        "segment": 0
      },
      {
        "prompt": "Label point (33) on the diagram above.",
        "kind": "text",
        "answer": "speech processor",
        "explanation": "At 24:25 the lecturer names the speech processor behind the microphone in image two.",
        "segment": 0
      },
      {
        "prompt": "Label point (34) on the diagram above.",
        "kind": "text",
        "answer": "receiver",
        "explanation": "At 24:43 the lecturer points to the surgically implanted receiver under the skin.",
        "segment": 0
      },
      {
        "prompt": "Label point (15) on the diagram above.",
        "kind": "text",
        "answer": "car park",
        "explanation": "At 09:39 Sally points out the car park near the Olympic site train lines, matching this label on the plan.",
        "segment": 1
      },
      {
        "prompt": "Label point (16) on the diagram above.",
        "kind": "text",
        "answer": "rose garden",
        "explanation": "At 10:06 Sally points out the rose garden to the west of the Tower.",
        "segment": 1
      },
      {
        "prompt": "Label point (17) on the diagram above.",
        "kind": "text",
        "answer": "cafe",
        "explanation": "At 10:06 Sally points out the cafe near the lake, visible through the trees.",
        "segment": 1
      }
    ]
  },
  "form-completion": {
    "title": "Exercise. Complete the form, notes or table",
    "intro": "Real questions from two different IELTS Listening tests. Keep to the word limit given for each one.",
    "segments": [
      {
        "src": "/audio/listening/test-011.mp3",
        "startSeconds": 0.0,
        "endSeconds": 265.2,
        "source": "Listening Test 11, Part 1, Questions 1 to 10",
        "transcriptHtml": "<p class=\"transcript-note\">Automatic transcript. It may contain small recognition errors; the answer key is authoritative.</p><p><span class=\"ts\">[00:00]</span> Section 1. You will hear a man arranging to get a telephone connection. First you have some time to look at questions 1 to 4. Now we shall begin. You should answer the questions as you listen because you will not hear the recording a second time. Listen carefully and answer questions 1 to 4.</p><p><span class=\"ts\">[00:43]</span> This is the Clear Point Telephone Company Customer Service Office. My name is Ms. Jones. How may I help you? Yes, I&#x27;m moving and I&#x27;d like to arrange to have a phone line installed. Of course. Let me get some information from you first. May I have your name please?</p><p><span class=\"ts\">[01:01]</span> It&#x27;s Kramer, Harold Kramer. And would you spell your last name for me please? K-R-A-M-E-R. M-E-R. Got it. Okay. Could I have the address where you&#x27;d like to have the telephone connected?</p><p><span class=\"ts\">[01:19]</span> That would be number 58, Fulton Avenue, apartment 12. Is that a business or a residence? A residence. It&#x27;s my new home address. Then the type of phone service you want is residential, not business?</p><p><span class=\"ts\">[01:33]</span> Yes, yes. It&#x27;s for my home. Alright. Fine. Now let me get your employment information. Who is your current employer? I work at the Ritesville Medical Group. And your occupation is doctor?</p><p><span class=\"ts\">[01:48]</span> No, I work for the doctors. I&#x27;m the office manager. Now listen and answer questions five to ten. Okay. And could I have your work phone number? It&#x27;s 637-555-9014.</p><p><span class=\"ts\">[02:23]</span> 9014. Great. Just one more thing. I need to know how long you&#x27;ve been at your current job. I&#x27;ve been working there for quite a while now. Let me see. Eight? No, nine. That&#x27;s right. Nine years. Okay, good. You&#x27;ve been there long enough, so I don&#x27;t need to ask about any other work history. Now, in addition to our basic phone service, we have several special services available.</p><p><span class=\"ts\">[02:51]</span> Could you explain them to me? Most customers opt for unlimited long distance service. It really saves you money if you make a lot of long distance calls. That sounds like a good idea. Then I&#x27;ll put you down for long distance service. Another popular service is voicemail.</p><p><span class=\"ts\">[03:09]</span> Voicemail takes all your messages electronically, and all it takes is one simple phone call to retrieve them. voicemail. No, I don&#x27;t think so. I have an answering machine to take my messages. It&#x27;s old, but it still works fine. We also provide internet service if you&#x27;re interested in that. I am. Please put me down for internet as well as phone service.</p><p><span class=\"ts\">[03:33]</span> Right. Okay, I think we&#x27;re almost finished. I just need to schedule a time for the technician to go to your apartment and do the installation. Let me see. What about next Tuesday? Would that work for you? No, not Tuesday. I&#x27;ll be at a conference all day. Wednesday would work, though. I&#x27;m afraid I won&#x27;t have any technicians in your area on Wednesday. I could send someone on Friday.</p><p><span class=\"ts\">[04:01]</span> That would be fine. What time of day works best for you? Morning or afternoon? Morning would be best. Alright, then. It&#x27;s on the schedule. Do you have any questions?</p><p><span class=\"ts\">[04:13]</span> No, I don&#x27;t think so. Thank you for calling Clearpoint. That is the end of section one. You now have half a minute to check your answers.</p>"
      },
      {
        "src": "/audio/listening/test-007.mp3",
        "startSeconds": 0.0,
        "endSeconds": 357.66,
        "source": "Listening Test 7, Part 1, Questions 3 to 10",
        "transcriptHtml": "<p class=\"transcript-note\">Automatic transcript. It may contain small recognition errors; the answer key is authoritative.</p><p><span class=\"ts\">[00:02]</span> Test 1. You will hear a number of different recordings, and you will have to answer questions on what you hear. There will be time for you to read the instructions and questions, and you will have a chance to check your work. All the recordings will be played once only. The test is in four sections. At the end of the test, you will be given 10 minutes to transfer</p><p><span class=\"ts\">[00:28]</span> your answers to an answer sheet. Now turn to section 1. Section 1. You will hear a conversation between two friends called George and Nina about a summer music festival. First, you have some time to look at questions 1 and 2. Now we shall begin. You should answer the questions as you listen, because you will not hear the recording a second time. Listen carefully and</p><p><span class=\"ts\">[01:15]</span> answer questions 1 and 2. Hi, George. Glad you&#x27;re back. Loads of people have phoned you. Really? I felt just like your secretary. Sorry. I went into the library this afternoon to have a look at a newspaper and I came across something really interesting. What? A book? No, a brochure from a summer festival, mainly Spanish music. Look, I&#x27;ve got it here. Spanish music? I really</p><p><span class=\"ts\">[01:44]</span> love the guitar. Let&#x27;s have a look. So what&#x27;s this group, Guitarini? They&#x27;re really good. They had a video with all the highlights of the festival at a stand in the lobby to the library. So I heard them. They play fantastic instruments, drums and flutes and old kinds of guitars. I&#x27;ve never heard anything like it before. Sounds great. Okay. Should we go</p><p><span class=\"ts\">[02:09]</span> then, spoil ourselves? Yes, let&#x27;s. The only problem is there aren&#x27;t any cheap seats. It&#x27;s all one price. Well, in that case, we could sit right at the front. We&#x27;d have a really good view. Yeah, though I think that if you sit at the back, you can actually hear the whole thing better. Yes. Anyway, we can decide when we get there. Before you hear the rest</p><p><span class=\"ts\">[02:37]</span> of the conversation, you have some time to look at questions three to ten. Now listen and answer questions three to ten. So will you fill in the form or shall I? I&#x27;ll do it. Name. George O&#x27;Neill. Address. 48 North Avenue West Sea. Do you remember our new postcode? No, I can&#x27;t remember it. Just a minute. I&#x27;ve got it written down here. W-S-6-2-Y-H. Do you</p><p><span class=\"ts\">[03:55]</span> need the phone to? Please. I&#x27;m really bad at numbers. 01674-5532. So let&#x27;s book two tickets for guitarini. Okay. If you&#x27;re sure 750 each is all right, how do you feel about the singer? I haven&#x27;t quite decided. But I&#x27;ve noticed something on the booking form that might just persuade me. What&#x27;s that then? Free refreshments? Really? Yes. Look here. Sunday</p><p><span class=\"ts\">[04:26]</span> 17th of June. Singer. Ticket. 6 pounds includes drinks in the garden. Sounds like a bargain to me. Yes. Let&#x27;s book two tickets for that. So what else? I&#x27;m feeling quite keen now. How about the pianist on the 22nd of June? And a ventura. I&#x27;ve just remembered that&#x27;s my evening class night. That&#x27;s okay. I&#x27;ll just have to go on my own. But we can go to the Spanish</p><p><span class=\"ts\">[04:53]</span> dance and guitar concert together, can&#x27;t we? Yes. I&#x27;m sure Tom and Kieran would enjoy that too. Good heavens. 10 pounds, 50. A ticket. I can see we&#x27;re going to have to go without food for the rest of the week. We&#x27;ll need to book four. Oh, wish we were students. Look, children, students and senior citizens get a 50% discount on everything. If only. That</p><p><span class=\"ts\">[05:20]</span> is the end of section one. You now have half a minute to check your answers. Now turn to</p>"
      }
    ],
    "questions": [
      {
        "prompt": "Harold _____",
        "kind": "text",
        "answer": "Kramer",
        "explanation": "At 01:01 the caller spells his surname: \"It's Kramer, Harold Kramer... K-R-A-M-E-R.\"",
        "segment": 0
      },
      {
        "prompt": "_____ Fulton Avenue apartment 12",
        "kind": "text",
        "answer": "58",
        "explanation": "At 01:19 he gives the house number as 58, before Fulton Avenue.",
        "segment": 0
      },
      {
        "prompt": "Type of service: _____",
        "kind": "text",
        "answer": "residential",
        "explanation": "At 01:33 Ms Jones confirms the service type is residential, not business.",
        "segment": 0
      },
      {
        "prompt": "Occupation: _____",
        "kind": "text",
        "answer": "office manager",
        "explanation": "At 01:48 Harold corrects Ms Jones: he is not a doctor, he is the office manager.",
        "segment": 0
      },
      {
        "prompt": "Work Phone: _____",
        "kind": "text",
        "answer": "6375559014",
        "explanation": "At 01:48 he gives his work number as 637-555-9014, read as one string of digits.",
        "segment": 0
      },
      {
        "prompt": "Time at current job: _____",
        "kind": "text",
        "answer": "nine years",
        "explanation": "At 02:23 Harold first says eight years, then corrects himself to nine years.",
        "segment": 0
      },
      {
        "prompt": "_____ and (...)",
        "kind": "text",
        "answer": "long distance",
        "explanation": "At 02:51 Ms Jones notes down the long distance service after Harold agrees to it.",
        "segment": 0
      },
      {
        "prompt": "(...) and _____",
        "kind": "text",
        "answer": "internet",
        "explanation": "At 03:33 Harold declines voicemail but asks to add internet service as well as phone.",
        "segment": 0
      },
      {
        "prompt": "Day _____ Time of day (...)",
        "kind": "text",
        "answer": "friday",
        "explanation": "At 03:33 they try Tuesday and Wednesday first; Harold agrees to Friday once it's offered.",
        "segment": 0
      },
      {
        "prompt": "Day (...) Time of day _____",
        "kind": "text",
        "answer": "morning",
        "explanation": "At 04:01 Harold says morning works best for the installation visit.",
        "segment": 0
      },
      {
        "prompt": "Address: _____ Westsea",
        "kind": "text",
        "answer": "48 north avenue",
        "explanation": "At 02:37 George gives his address as 48 North Avenue, Westsea.",
        "segment": 1
      },
      {
        "prompt": "Postcode: _____",
        "kind": "text",
        "answer": "WS62YH",
        "explanation": "At 02:37 Nina reads the postcode letter by letter: W-S-6-2-Y-H.",
        "segment": 1
      },
      {
        "prompt": "Telephone: _____",
        "kind": "text",
        "answer": "01674553242",
        "explanation": "At 03:55 George reads out his phone number; the automatic transcript cuts off partway through the digits, but the answer key gives the full number as 01674553242.",
        "segment": 1
      },
      {
        "prompt": "Singer (price includes _____ in the garden",
        "kind": "text",
        "answer": [
          "drinks",
          "refreshments"
        ],
        "explanation": "At 04:26 George reads that the singer's ticket price includes drinks in the garden.",
        "segment": 1
      },
      {
        "prompt": "_____ Anna Ventura",
        "kind": "text",
        "answer": [
          "pianist",
          "piano player"
        ],
        "explanation": "At 04:26 Nina asks about the pianist performing on 22 June, filling the table's event column.",
        "segment": 1
      },
      {
        "prompt": "June: _____ £",
        "kind": "text",
        "answer": "10.50",
        "explanation": "At 04:53 Nina reads the ticket price for the Spanish dance and guitar concert as 10 pounds 50.",
        "segment": 1
      },
      {
        "prompt": "June: _____",
        "kind": "text",
        "answer": "4",
        "explanation": "At 04:53 they agree to book four tickets for the Spanish dance and guitar concert.",
        "segment": 1
      },
      {
        "prompt": "NB: Children/ students/ senior citizens have _____ discount on all tickets",
        "kind": "text",
        "answer": "50%",
        "explanation": "At 04:53 George notes that children, students and senior citizens get a 50% discount on all tickets.",
        "segment": 1
      }
    ]
  },
  "sentence-completion": {
    "title": "Exercise. Complete the sentences",
    "intro": "Real questions from two different IELTS Listening tests. Keep to the word limit given for each one.",
    "segments": [
      {
        "src": "/audio/listening/test-001.mp3",
        "startSeconds": 891.07,
        "endSeconds": 1253.12,
        "source": "Listening Test 1, Part 3, Questions 21 to 30",
        "transcriptHtml": "<p class=\"transcript-note\">Automatic transcript. It may contain small recognition errors; the answer key is authoritative.</p><p><span class=\"ts\">[14:51]</span> Now turn to section 3. Section 3. You will hear a geography student called Caroline, discussing her dissertation with her tutor. First, you have some time to look at questions 21 to 23. Now listen carefully and answer questions 21 to 23. Ah, Caroline. Come on in, sit down. Thanks.</p><p><span class=\"ts\">[15:40]</span> So how&#x27;s the dissertation planning going? Well, Dr. Schulman, I&#x27;m still having a lot of trouble deciding on a title. Well, that&#x27;s perfectly normal at this stage. And this is what your tutorials will help you to do. Right. What we&#x27;ll do is jot down some points that might help you in your decision. First of all, you have chosen your general topic area, haven&#x27;t you? Yes. It&#x27;s</p><p><span class=\"ts\">[16:06]</span> the fishing industry. Oh yes, that was one of the areas you mentioned. Now, what aspects of the course are you good at? Well, I think I&#x27;m coping well with statistics and I&#x27;m never bored by it. Good. Anything else? Well, I&#x27;ve found computer modelling fascinating. I have no problem following what&#x27;s being taught, whereas quite a few of my classmates find it difficult.</p><p><span class=\"ts\">[16:35]</span> Well, that&#x27;s very good. Do you think these might be areas you could bring into your dissertation? Oh yes. If possible. It&#x27;s just that I&#x27;m having difficulty thinking how I can do that. You see, I feel I don&#x27;t have sufficient background information. I see. Well, do you take notes? I&#x27;m very weak at note taking. My teachers always used to say that.</p><p><span class=\"ts\">[16:59]</span> Well, I think you really need to work on these weaknesses before you go any further. What do you suggest? Before you hear the rest of the tutorial, you have some time to look at questions 24 to 30. Now listen and answer questions 24 to 30. Well, I can go through the possible strategies with you and let you decide where to go from there.</p><p><span class=\"ts\">[17:50]</span> Okay, thanks. Well, some people find it helpful to organize peer group discussions. You know, each week a different person studies a different topic and shares it with the group. Oh, right. It really helps build confidence. Yeah. You know, having to present something to others. I can see that.</p><p><span class=\"ts\">[18:10]</span> The drawback is that everyone in the group seems to share the same ideas. They keep being repeated in all the dissertations. Okay. You could also try a service called Student Support. It&#x27;s designed to give you a structured program over a number of weeks to develop your skills. Sounds good? Yes. Unfortunately, there are only a few places. But it&#x27;s worth looking into.</p><p><span class=\"ts\">[18:35]</span> Yes, of course. I know I&#x27;ve got to work on my study skills. And then there are several study skills books you can consult. Right. They&#x27;ll be a good source of reference. But the problem is there are sometimes too general. Yes, that&#x27;s what I found. Other than that, I would strongly advise quite simple ideas</p><p><span class=\"ts\">[18:58]</span> like using a card index. Well, yes, I&#x27;ve never done that before. It&#x27;s simple. But it really works because you have to get points down in a small space. Another thing I always advise is don&#x27;t just take your notes and forget about them. Read everything three times. That&#x27;ll really fix them in your mind.</p><p><span class=\"ts\">[19:20]</span> Yes. I can see it to take discipline, but... Well, if you establish good study skills at this stage, they&#x27;ll be with you all your life. Oh, yes, I completely agree. It&#x27;s just that I don&#x27;t seem to be able to discipline myself. I need to talk things over.</p><p><span class=\"ts\">[19:38]</span> Well, we&#x27;ll be continuing these tutorials, of course. Let&#x27;s arrange next months now. Let&#x27;s see. I can see you virtually any time during the week starting the 22nd of January. What about the 24th? I&#x27;m free in the afternoon.</p><p><span class=\"ts\">[20:00]</span> Sorry, I&#x27;m booked then. What about the following day? The first day I can make the morning. Fine. We&#x27;ll go for the 25th then. That&#x27;s great. Thanks. That is the end of section three.</p><p><span class=\"ts\">[20:19]</span> You now have half a minute to check your answers.</p>"
      },
      {
        "src": "/audio/listening/test-002.mp3",
        "startSeconds": 0.0,
        "endSeconds": 391.9,
        "source": "Listening Test 2, Part 1, Questions 1 to 10",
        "transcriptHtml": "<p class=\"transcript-note\">Automatic transcript. It may contain small recognition errors; the answer key is authoritative.</p><p><span class=\"ts\">[00:00]</span> Test 2. You will hear a number of different recordings, and you will have to answer questions on what you hear. There will be time for you to read the instructions and questions, and you will have a chance to check your work. All the recordings will be played once only. The test is in four sections. At the end of the test, you will be given ten minutes to</p><p><span class=\"ts\">[00:30]</span> transfer your answers to an answer sheet. Now turn to section one, section one. You will hear a student talking to the student accommodation officer at a college. First, you have some time to look at questions one to five. Now we shall begin. You should answer the questions as you listen, because you will not hear the recording a second time. Listen carefully and</p><p><span class=\"ts\">[01:28]</span> answer questions one to five. Good morning. Can I help you? Yes. I&#x27;ve just been accepted on a course at the university, and I&#x27;d like to try and arrange accommodation in the Hall of residence. Yes, certainly. Please sit down. What I&#x27;ll do is fill in a form with you to find out a little more about your preferences and so forth. Thank you. So, first of all, can I take your name?</p><p><span class=\"ts\">[01:56]</span> It&#x27;s Anubat. Could you spell your name, please? Yes. A-N-U-B-H-A-T. Thanks, and could I ask your date of birth? 31st of March, 1972. Thank you. And where are you from? India. Oh, right. And what will you be studying? I&#x27;m doing a course in nursing. Right. Thank you. And how long would you want to stay in Hall, do you think? Well, it will take three years, but I&#x27;d only like to stay in Hall for two. I&#x27;d like to think about</p><p><span class=\"ts\">[02:33]</span> living outside for the third year. Fine. And what did you have in mind for catering? Do you want to cook for yourself or have all your meals provided? That&#x27;s full board. Is there something in between? Yes. You can just have evening meal provided, which is half board. That&#x27;s what I&#x27;d prefer. Yes. A lot of students are opt for that. Now, with that in mind,</p><p><span class=\"ts\">[02:56]</span> do you have any special diet, anything we should know about? Yes. I don&#x27;t take red meat. No red meat. Before you hear the rest of the conversation, you have some time to look at questions six to ten. Now listen and answer questions six to ten. Now, thinking about the room itself, we have a number of options. You can have a single study</p><p><span class=\"ts\">[03:57]</span> bedroom or you can have a shared one. These are both what we call simple rooms. The other alternative is to opt for a single bed sit, which actually has more space and better facilities. There&#x27;s about 20 pounds a week difference between them. Well, actually, my grant is quite generous and I think the bed sit sounds the best option.</p><p><span class=\"ts\">[04:18]</span> Lovely. I&#x27;ll put you down for that and we&#x27;ll see what availability is like. Now, can I ask some other personal details which we like to have on record? Yes, of course. I wonder if you could let us know what your interests are. This might help us get a closer match for placing you in a particular hall.</p><p><span class=\"ts\">[04:37]</span> Well, I love the theatre. Right. And I enjoy sports, particularly badminton. Ah, that&#x27;s worth knowing. Now, what we finish with on the form is really a list from you of what</p><p><span class=\"ts\">[04:49]</span> your priorities are in choosing a hall. And we&#x27;ll do our best to take these into account. Well, the first thing is I&#x27;d prefer a hall where there are other mature students, if possible. Yes, we do have halls which tend to cater for slightly older students. And I&#x27;d prefer to be out of town.</p><p><span class=\"ts\">[05:10]</span> That&#x27;s actually very good for you because we tend to have more vacancies in out of town hall. Ah, lucky. Yes. Anything else? Well, I would like somewhere with a shared area, a TV room, for example, or something like that.</p><p><span class=\"ts\">[05:25]</span> It&#x27;s a good way to socialise. Certainly is. That&#x27;s it. Now, we just need a contact telephone number for you.</p><p><span class=\"ts\">[05:32]</span> Oh, sure. I&#x27;ll just find it. It&#x27;s double six, seven, five, four, nine. Great. So we&#x27;ll be in contact with you as soon as possible. That is the end of section one. You now have half a minute to check your answers.</p><p><span class=\"ts\">[06:24]</span> Now turn to section two.</p>"
      }
    ],
    "questions": [
      {
        "prompt": "Dissertation topic: the _____",
        "kind": "text",
        "answer": "fishing industry",
        "explanation": "At 16:06 Caroline confirms her topic area is \"the fishing industry\".",
        "segment": 0
      },
      {
        "prompt": "Strengths: _____",
        "kind": "text",
        "answer": "statistics",
        "explanation": "At 16:06 Caroline says she is \"coping well with statistics and I'm never bored by it\".",
        "segment": 0
      },
      {
        "prompt": "Poor _____",
        "kind": "text",
        "answer": "note-taking",
        "explanation": "At 16:35 Caroline admits she is \"very weak at note taking\".",
        "segment": 0
      },
      {
        "prompt": "Increase _____",
        "kind": "text",
        "answer": "confidence",
        "explanation": "At 17:50 the tutor says peer group discussion \"really helps build confidence\".",
        "segment": 0
      },
      {
        "prompt": "Dissertations tend to contain the same _____",
        "kind": "text",
        "answer": "ideas",
        "explanation": "At 18:10 the tutor warns that in peer groups everyone \"seems to share the same ideas\", which then repeat in the dissertations.",
        "segment": 0
      },
      {
        "prompt": "Use the _____ service",
        "kind": "text",
        "answer": "student support",
        "explanation": "At 18:10 the tutor suggests \"a service called Student Support\" with a structured programme.",
        "segment": 0
      },
      {
        "prompt": "Limited _____",
        "kind": "text",
        "answer": "places",
        "explanation": "At 18:10 the tutor warns that for Student Support \"there are only a few places\".",
        "segment": 0
      },
      {
        "prompt": "Can be too _____",
        "kind": "text",
        "answer": "general",
        "explanation": "At 18:35 the tutor says study skills books \"are sometimes too general\".",
        "segment": 0
      },
      {
        "prompt": "Read all notes _____",
        "kind": "text",
        "answer": "3 times",
        "explanation": "At 18:58 the tutor advises \"read everything three times\" to fix notes in mind.",
        "segment": 0
      },
      {
        "prompt": "Next tutorial date: _____",
        "kind": "text",
        "answer": "25",
        "explanation": "At 20:00 they agree on the date: \"We'll go for the 25th then.\"",
        "segment": 0
      },
      {
        "prompt": "Name: Anu _____",
        "kind": "text",
        "answer": "Bhatt",
        "explanation": "At 01:56 the student spells her surname \"A-N-U-B-H-A-T\"; the recording gives one T where the answer key has \"Bhatt\".",
        "segment": 1
      },
      {
        "prompt": "Date of birth: _____",
        "kind": "text",
        "answer": "31 March",
        "explanation": "At 01:56 she gives her date of birth as \"31st of March, 1972\".",
        "segment": 1
      },
      {
        "prompt": "Course of study: _____",
        "kind": "text",
        "answer": "nursing",
        "explanation": "At 01:56 she says \"I'm doing a course in nursing.\"",
        "segment": 1
      },
      {
        "prompt": "Number of years planned in hall: _____",
        "kind": "text",
        "answer": "2",
        "explanation": "At 01:56 she says the course is three years but \"I'd only like to stay in Hall for two.\"",
        "segment": 1
      },
      {
        "prompt": "Special dietary requirements: no _____ (red)",
        "kind": "text",
        "answer": "meat",
        "explanation": "At 02:56 she says \"I don't take red meat. No red meat.\"",
        "segment": 1
      },
      {
        "prompt": "Preferred room type: a single _____",
        "kind": "text",
        "answer": "bedsit",
        "explanation": "At 03:57 she decides \"the bed sit sounds the best option.\"",
        "segment": 1
      },
      {
        "prompt": "Interests: the _____",
        "kind": "text",
        "answer": "theatre",
        "explanation": "At 04:37 she says \"I love the theatre\", alongside badminton.",
        "segment": 1
      },
      {
        "prompt": "Priorities in choice of hall: to be with other students who are _____",
        "kind": "text",
        "answer": [
          "mature",
          "older"
        ],
        "explanation": "At 04:49 she says she would prefer \"a hall where there are other mature students\".",
        "segment": 1
      },
      {
        "prompt": "To live outside the _____",
        "kind": "text",
        "answer": "town",
        "explanation": "At 04:49 she adds \"I'd prefer to be out of town.\"",
        "segment": 1
      },
      {
        "prompt": "To have a _____ area for socializing",
        "kind": "text",
        "answer": "shared",
        "explanation": "At 05:10 she wants \"somewhere with a shared area, a TV room\".",
        "segment": 1
      }
    ]
  },
  "short-answer": {
    "title": "Exercise. Answer the questions",
    "intro": "Real questions from two different IELTS Listening tests. Keep to the word limit given for each one.",
    "segments": [
      {
        "src": "/audio/listening/test-008.mp3",
        "startSeconds": 0.0,
        "endSeconds": 329.3,
        "source": "Listening Test 8, Part 1, Questions 7 to 10",
        "transcriptHtml": "<p class=\"transcript-note\">Automatic transcript. It may contain small recognition errors; the answer key is authoritative.</p><p><span class=\"ts\">[00:00]</span> Test 4. You will hear a number of different recordings and you will have to answer questions on what you hear. There will be time for you to read the instructions and questions and you will have a chance to check your work. All the recordings will be played once only. The test is in four sections. At the end of the test you will be given ten minutes to</p><p><span class=\"ts\">[00:27]</span> transfer your answers to an answer sheet. Now turn to section one. Section one. You will hear a student talking to a housing officer about living with a home stay family. First you have some time to look at questions one to six. Now we shall begin. You should answer the questions as you listen because you will not hear the recording a second time. Listen</p><p><span class=\"ts\">[01:29]</span> carefully and answer questions one to six. Yes, what can I do for you? My friend is in homestay and she really enjoys it so I&#x27;d like to join a family as well. Okay, so let me get some details. What&#x27;s your name? My name is Keiko Yucchini. Could you spell your family name for me? It&#x27;s Yucchini. That&#x27;s Y-U-I-C-H-I-N-I. And your first name? It&#x27;s Keiko. K-E-I-K-O.</p><p><span class=\"ts\">[02:13]</span> That&#x27;s Keiko Yucchini. Okay. And your female. And your nationality? I&#x27;m Japanese. Right. And could I see your passport please? Here it is. Okay. Your passport number is J-O-6-3-7. And you&#x27;re how old? I&#x27;m 28 years old. Now you live at one of the colleges. Which one? Willow College. Room 21-C. Right. 21-C Willow College. And how long are you planning on staying with</p><p><span class=\"ts\">[02:50]</span> homestay? About four months. Longer if I like it. And what course are you enrolled in? Well, I&#x27;ve enrolled for 20 weeks in the advanced English studies because I need help with my writing. And I&#x27;m nearly at the end of my first five week course. Okay. Do you have any preference for a family with children or without children? I prefer. I mean, I like young children. But</p><p><span class=\"ts\">[03:23]</span> I&#x27;d like to be with older people. You know, adults, someone around my age. Okay. And what about pets? I am a veterinarian so that&#x27;s fine. The more the better. Before you hear the rest of the conversation, you have some time to look at questions seven to ten. Now listen and answer questions seven to ten. All right. Now, what about you? Are you a vegetarian or do you have</p><p><span class=\"ts\">[04:18]</span> any special food requirements? No, I am not a vegetarian. But I don&#x27;t eat a lot of meat. I really like seafood. And what are your hobbies? I like reading and going to the movies. Do you play any sports? Yes. I joined the handball team. But I didn&#x27;t like that. So I stopped playing. Now I play tennis on the weekend with my friends. All right. Let&#x27;s see. Name, age, now the location.</p><p><span class=\"ts\">[04:50]</span> Are you familiar with the public transport system? No. I&#x27;m not really because I have been living on campus. I&#x27;ve been to the city a few times on the bus. But they are always late. What about the trains? I like catching the train. They are much faster. Now let me go check on the computer and see who I&#x27;ve got. Listen, leave it with me. I&#x27;ll check my records and I&#x27;ll give you details this</p><p><span class=\"ts\">[05:17]</span> afternoon. Thank you for helping me. It&#x27;s a pleasure. Bye. Bye. That is the end of section one. You now</p>"
      },
      {
        "src": "/audio/listening/test-018.mp3",
        "startSeconds": 735.67,
        "endSeconds": 1128.22,
        "source": "Listening Test 18, Part 3, Questions 27 to 30",
        "transcriptHtml": "<p class=\"transcript-note\">Automatic transcript. It may contain small recognition errors; the answer key is authoritative.</p><p><span class=\"ts\">[12:15]</span> Section three. You will hear a tutor and some students talking about an assignment. Listen carefully and answer questions 21 to 26. Come in. Sit down. Good to see you.</p><p><span class=\"ts\">[13:24]</span> Hello. Hello. Now, this assignment. The best thing we can do, I think, is to think how we can approach it.</p><p><span class=\"ts\">[13:31]</span> The main point is to investigate television, but not what&#x27;s happened in the past. I was thinking that it would be necessary to go over the new media first. Yes, that&#x27;s a way to make a start. But you need to do that quite briefly. But it&#x27;s quite a complex topic.</p><p><span class=\"ts\">[13:46]</span> Yeah, I agree. But the emphasis must be on the future development of television as a cultural phenomenon. Yes. I&#x27;ve been reading the talk by Ashley Highfield. All right. And what do you take from that? What are the things that are competing with television? Well, to start with, there is the games console.</p><p><span class=\"ts\">[14:04]</span> Then there is the personal computer and the internet. Then again, the mobile phone with its capability of games and puzzles. And, of course, internet access. Lastly, there is the iPod with the possibility of listening to music wherever you go.</p><p><span class=\"ts\">[14:20]</span> Good. You&#x27;ve understood that. Now, which of these presents the greatest competition for television? Well, according to the research, it&#x27;s video games. Yes, that&#x27;s true at present. But in the future...</p><p><span class=\"ts\">[14:32]</span> I think the phone will present the greatest threat then. And why? Because it&#x27;s mobile, portable and it&#x27;s developing fast. Yeah, I think you&#x27;re right. You need always to look to the future and try to assess how things will develop, as we said. Good. Now, you need to move on to the new social trends in connection with television.</p><p><span class=\"ts\">[14:52]</span> Is one of them the idea that programs might become shorter and shorter? Ah, yes. The average program might be ten minutes. Or even less. Just mini programs, say four to five minutes long. Now, do you think you can get access to all the materials you need?</p><p><span class=\"ts\">[15:08]</span> The problem at the moment is the library. Oh, yes. What&#x27;s happening there? There&#x27;s a tremendous amount of noise because of the new extension they are building. It&#x27;s quite impossible to work there.</p><p><span class=\"ts\">[15:18]</span> They are stopping work for a week next week, I believe. And then all the sections will be open. There&#x27;s a hold-up because some roof tiles have not arrived, so there&#x27;ll be peace for that week. But then after that, the media studies section will be closed for a week, and all the noise and dirt will start up again.</p><p><span class=\"ts\">[15:34]</span> Yes, the sociology section will be open, and there&#x27;s some good stuff there for you on this topic, and it&#x27;s further away from the noise. Yes, I don&#x27;t think the sociology section is affected at all, and neither is the journal section. No, obviously they&#x27;re rotating the closures, and it was sociology&#x27;s turn to close for a week last term. I think we should make a complaint.</p><p><span class=\"ts\">[15:54]</span> Yeah, and I think you should. I&#x27;ve had a word with the library staff, they are very sympathetic, but... They are affected by these works just as we are. If I were you, I&#x27;d make a complaint directly to the premises committee.</p><p><span class=\"ts\">[16:05]</span> They only meet once a year, but in fact, I know they&#x27;re having a meeting next Tuesday. You might like to make contact with them, but don&#x27;t say that I suggested this. Yes. But the students&#x27; union might be better since they are independent of the university.</p><p><span class=\"ts\">[16:19]</span> That&#x27;s true, but I can&#x27;t imagine that people haven&#x27;t already approached them about this. Let&#x27;s try the premises committee. Good idea, why not? Okay.</p><p><span class=\"ts\">[16:28]</span> Now, don&#x27;t forget I need a copy of your dissertations by email, and two copies in print, that is on paper. If you give the Reprographics Office 24 hours notice, they&#x27;ll make copies for you. And if you give them my details, they&#x27;ll send those copies directly to me. They won&#x27;t send copies to you, so you&#x27;ll need to take your own copy personally from them.</p><p><span class=\"ts\">[16:48]</span> Good. Any questions? Now answer questions 27 to 30. One little thing was just that I wondered whether we should actually talk about that famous website. You know the one, YouTube.</p><p><span class=\"ts\">[17:21]</span> Ah, I was rather hoping you hadn&#x27;t overlooked that. Good point. It&#x27;s mostly homemade videos. I suppose you could say that each video is a television version of a podcast.</p><p><span class=\"ts\">[17:31]</span> Anything else? Yes, I&#x27;ve got a question, I&#x27;m afraid. I&#x27;m not completely clear about the exact meaning of culture, as we are using it in this subject. Well, Mrs Jones is giving a lecture on culture and society in the University Theatre.</p><p><span class=\"ts\">[17:46]</span> It&#x27;s on Wednesday at 10am, and you can learn all about it there, I&#x27;m sure. Can you give us that again, please? Yes, that&#x27;s culture and society. It&#x27;s in the University Theatre, and let me just check the time.</p><p><span class=\"ts\">[17:59]</span> Yes, here it is, 10am on Wednesday. She&#x27;ll be giving a very thorough discussion of the issues in defining what culture means. Right. That&#x27;s good. The thing is, the reading list confused me a bit.</p><p><span class=\"ts\">[18:13]</span> One thing that occurred to me was that it might be broken down into subsections for future students. Yes, that&#x27;s a fair point. I&#x27;ll bear that in mind. Now, don&#x27;t forget, you need to do the reading and finish the assignment by the 4th of July. Is that okay?</p><p><span class=\"ts\">[18:27]</span> Fine. Thank you very much. Now turn to section 4.</p>"
      }
    ],
    "questions": [
      {
        "prompt": "What does the student particularly like to eat? _____",
        "kind": "text",
        "answer": "seafood",
        "explanation": "At 04:18 the student says she particularly likes seafood.",
        "segment": 0
      },
      {
        "prompt": "What sport does the student play? _____",
        "kind": "text",
        "answer": "tennis",
        "explanation": "At 04:18 the student says she now plays tennis at weekends, having given up handball.",
        "segment": 0
      },
      {
        "prompt": "What mode of transport does the student prefer? _____",
        "kind": "text",
        "answer": "trains",
        "explanation": "At 04:50 the student says she prefers trains to buses because they are faster.",
        "segment": 0
      },
      {
        "prompt": "When will the student find out her homestay address? _____",
        "kind": "text",
        "answer": "that afternoon",
        "explanation": "At 04:50 the officer says he will give the student her homestay address that afternoon.",
        "segment": 0
      },
      {
        "prompt": "What does the tutor compare homemade videos with? _____",
        "kind": "text",
        "answer": "a podcast",
        "explanation": "At 17:21 the tutor says \"each video is a television version of a podcast\" when describing homemade videos.",
        "segment": 1
      },
      {
        "prompt": "What is the title of Mrs Jone’s lecture? _____",
        "kind": "text",
        "answer": "culture and society",
        "explanation": "At 17:31 the tutor says Mrs Jones \"is giving a lecture on culture and society\", giving the lecture's title.",
        "segment": 1
      },
      {
        "prompt": "Where is the lecture? _____",
        "kind": "text",
        "answer": "university theatre",
        "explanation": "In the same line at 17:31, the tutor says the lecture is \"in the University Theatre\".",
        "segment": 1
      },
      {
        "prompt": "When is the final date for the assignment? _____",
        "kind": "text",
        "answer": "4 July",
        "explanation": "At 18:13 the tutor says to \"finish the assignment by the 4th of July\".",
        "segment": 1
      }
    ]
  }
};
