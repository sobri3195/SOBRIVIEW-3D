import { useReveal } from "../../hooks/useReveal";
import { useRef, useState } from "react";
import { questions, score, shuffle } from "../../data/quizzes";
import { read, write } from "../../lib/storage";
import { exportJSON } from "../../lib/export";
import { useApp } from "../../stores/useApp";
export default function Learning() {
  const [topic, setTopic] = useState("All");
  const [mode, setMode] = useState("Quiz");
  const [quiz, setQuiz] = useState(() => shuffle(questions).slice(0, 10));
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);
  const [bookmarks, setBookmarks] = useState<number[]>(() =>
    read(
      "bookmarks",
      (x) =>
        Array.isArray(x)
          ? x.filter((v): v is number => typeof v === "number")
          : [],
      [],
    ),
  );
  const q = quiz[index];
  function restart() {
    const pool = questions.filter((q) => topic === "All" || q.topic === topic);
    setQuiz(shuffle(pool).slice(0, 10));
    setIndex(0);
    setAnswers({});
    setDone(false);
    setFlipped(false);
  }
  const answer = answers[q.id];
  const question = useRef<HTMLElement>(null);
  useReveal(
    question,
    `${q.id}-${mode}-${done}`,
    ".quiz-meta, h2, .answers > button",
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">SOBRI LEARNING CENTER</div>
          <h1>Build your anatomical intuition.</h1>
          <p>
            {questions.length} locally available questions with explanations.
          </p>
        </div>
        <button
          onClick={() =>
            exportJSON(
              "sobriview-learning-progress.json",
              read("progress", (x) => x, []),
            )
          }
        >
          Export progress
        </button>
      </div>
      <div className="toolbar">
        <select
          aria-label="Learning topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        >
          {["All", ...new Set(questions.map((q) => q.topic))].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select
          aria-label="Learning mode"
          value={mode}
          onChange={(e) => {
            setMode(e.target.value);
            setFlipped(false);
          }}
        >
          <option>Quiz</option>
          <option>Flashcards</option>
          <option>Study</option>
        </select>
        <button onClick={restart}>Start / restart</button>
      </div>
      <div className="learning-layout">
        <section ref={question} className="panel quiz-card">
          {done ? (
            <>
              <div className="eyebrow">SESSION COMPLETE</div>
              <h2>
                {score(answers, quiz)} / {quiz.length} correct
              </h2>
              <p>Review explanations below, then start another session.</p>
              {quiz.map((q) => (
                <article key={q.id}>
                  <h3>
                    {answers[q.id] === q.answer ? "✓" : "○"} {q.question}
                  </h3>
                  <p>
                    {q.options[q.answer]} — {q.explanation}
                  </p>
                </article>
              ))}
              <button className="primary" onClick={restart}>
                Try again
              </button>
            </>
          ) : (
            <>
              <div className="quiz-meta">
                <span>
                  {q.topic} · {q.difficulty}
                </span>
                <span>
                  {index + 1} / {quiz.length}
                </span>
              </div>
              <progress value={index} max={quiz.length} />
              <h2>{q.question}</h2>
              {mode === "Quiz" ? (
                <div className="answers">
                  {q.options.map((option, i) => (
                    <button
                      key={option}
                      disabled={answer !== undefined}
                      className={
                        answer !== undefined
                          ? i === q.answer
                            ? "correct"
                            : answer === i
                              ? "incorrect"
                              : ""
                          : ""
                      }
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
                    >
                      <span>{String.fromCharCode(65 + i)}</span>
                      {option}
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  <button
                    className="flashcard"
                    key={q.id}
                    data-flipped={mode === "Study" || flipped}
                    aria-label={
                      mode === "Study" || flipped
                        ? q.options[q.answer]
                        : "Tap to reveal answer"
                    }
                    aria-pressed={flipped}
                    onClick={() => setFlipped(!flipped)}
                  >
                    <span className="flashcard-inner" aria-hidden="true">
                      <span className="flashcard-front">
                        Tap to reveal answer
                      </span>
                      <span className="flashcard-back">
                        {q.options[q.answer]}
                      </span>
                    </span>
                  </button>
                </>
              )}
              {(answer !== undefined || flipped || mode === "Study") && (
                <div className="explanation">
                  <strong>
                    {mode === "Quiz"
                      ? answer === q.answer
                        ? "Correct"
                        : "Review this concept"
                      : "Study note"}
                  </strong>
                  <p>{q.explanation}</p>
                </div>
              )}
              <div className="button-row">
                <button
                  onClick={() => {
                    const next = bookmarks.includes(q.id)
                      ? bookmarks.filter((id) => id !== q.id)
                      : [...bookmarks, q.id];
                    setBookmarks(next);
                    if (!write("bookmarks", next))
                      useApp.getState().notify("Bookmark storage unavailable.");
                  }}
                >
                  {bookmarks.includes(q.id) ? "★ Bookmarked" : "☆ Bookmark"}
                </button>
                <button
                  className="primary"
                  disabled={mode === "Quiz" && answer === undefined}
                  onClick={() => {
                    if (index === quiz.length - 1) {
                      setDone(true);
                      if (mode === "Quiz") {
                        const old = read<unknown[]>(
                          "progress",
                          (x) => (Array.isArray(x) ? x : []),
                          [],
                        );
                        if (
                          !write("progress", [
                            ...old,
                            {
                              date: new Date().toISOString(),
                              correct: score(answers, quiz),
                              total: quiz.length,
                            },
                          ])
                        )
                          useApp
                            .getState()
                            .notify("Progress could not be persisted.");
                      }
                    } else {
                      setIndex((i) => i + 1);
                      setFlipped(false);
                    }
                  }}
                >
                  {index === quiz.length - 1
                    ? "Finish session"
                    : "Next question →"}
                </button>
              </div>
            </>
          )}
        </section>
        <aside className="panel">
          <div className="eyebrow">YOUR STUDY SPACE</div>
          <h2>Learn at your pace.</h2>
          <p>
            Practice anatomy, orientation, liver segments, imaging principles
            and privacy.
          </p>
          <h3>{bookmarks.length} bookmarked questions</h3>
          <p>
            Learning results contain no patient information and are saved on
            this device.
          </p>
          <h3>References</h3>
          <p>
            OpenStax Anatomy & Physiology 2e, DICOM standard, and Couinaud
            segment terminology. These questions are educational and do not
            provide diagnostic advice.
          </p>
        </aside>
      </div>
    </>
  );
}
