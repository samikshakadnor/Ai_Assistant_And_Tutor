QUIZZES = []

RESULTS = []


def save_quiz(quiz):

    QUIZZES.append(quiz)

    return quiz


def save_result(result):

    RESULTS.insert(
        0,
        result
    )

    return result


def get_history():

    return RESULTS