#### Step #1

Select recorded play within the **History** window, and the player’s Favourite Games.
- Include games that are disabled, inactive or unsupported on the selected platform.
- Include favourites even if the player has never played them.


#### Step #2

Calculate the **Recency Weight**. for each game on each UTC day within the history window. Five bets on one day produce one score. Playing on five different days produces five scores.
```javascript
recency_weight = 2 ** (−days_ago / half_life)
```
| Variable | Definition |
|-|-|
| half_life | configurable number, e.g. 30 |
| days_ago | number of UTC calendar days between the activity day and the simulation’s as-of date |

#### Step #3

Calculate the **Daily Engagement** for each game on each UTC day within the history window. Five bets on one day produce one score. Playing on five different days produces five scores.

```javascript
daily_engagement = 2 × has_paid_rounds
  + ln(1 + min(paid_rounds, 100))
  + 0.50 × ln(1 + min(sessions, 10))
  + 0.25 × ln(1 + min(bonus_or_free_rounds, 100))
```
| Variable | Definition |
|-|-|
| has_paid_rounds | *1* if at least one paid round exists that day, otherwise *0* |
| paid_rounds | amount of real-balance non-zero bets within that day |
| sessions | amount of game sessions within that day |
| bonus_or_free_rounds | amount of bonus or free bets |
| min(...) | caps limit how much very high play counts can influence the score |
| ln(...) | makes additional rounds contribute progressively less |


#### Step #4

Identify **Player Interest Score** per game.
*Formula assumes a game been played on 6 days within **History** period.*
```javascript
player_interest_score =
  + (daily_engagement[1] × recency_weight[1])
  + (daily_engagement[2] × recency_weight[2])
  + ...
  + (daily_engagement[5] × recency_weight[5])
  + (daily_engagement[6] × recency_weight[6])
  + favourite_points
```
| Variable | Definition |
|-|-|
| recency_weight | values from 2nd step |
| daily_engagement | values from 3nd step |
| favourite_points | *6* if the game is favourite, otherwise i is *0* |


#### Step #5

Calculate **Total Interest Score**.
Just a sum of all **Player Interest Scores**.
Its used as *denominator* for calculating **Preference Scores**.
```javascript
total_interest_score = sum(player_interest_score)
```
| Variable | Definition |
|-|-|
| player_interest_score | value from 4th step |

#### Step #6

Calcualte **Preference Score** per *attribute*.
Possible attributes:
1. *providers*;
2. *features*;
3. *categorys*;
4. *themes*;
5. *playlines*.

Formula calculates **Preference Score** for *Egyptian theme* and assumes user played 3 different games with *Egyptian theme* within **History** Period.
```javascript
preference_scores['themes']['egyptian'] = 
    (
        player_interest_scores['game_with_egyptian_theme_1']
        + player_interest_scores['game_with_egyptian_theme_2']
        + player_interest_scores['game_with_egyptian_theme_3']
    )
    / total_interest_score
```
| Variable | Definition |
|-|-|
| player_interest_scores | value from 4th step |
| total_interest_score | value from 5th step |

#### Step #7

Identify **Compatible Games**.
A **Compatible Game** is a game which:
- Active;
- Enabled;
- Evaialble on the platform player is using (desktop or mobile).

#### Step #8

Calculate 5 **Attribute Match Scores** for each **Compatible Game**.
Formula assumes a game has: 
1. *providers*: Pragmatic;
2. *features*: Bonus Buy, In-game Jackpot;
3. *categories*: Video Slots;
4. *thems*: Egyptian, Adventure;
5. *playlines*: 5.
```javascript
provider_match = preference_scores['providers']['pragmatic'];

feature_match = 
    (
        preference_scores['features']['bonus-buy']
        + preference_scores['features']['in-game-jackpot']
    ) / 2;

category_match = preference_scores['categories']['video-slots'];

theme_match = 
    (
        + preference_scores['themes']['egyptian']
        + preference_scores['themes']['adventure']
    ) / 2;

playlines_match = preference_scores['playlines'][5];
```
| Variable | Definition |
|-|-|
| preference_scores | value from 6th step |

#### Step #9

Calculate 5 **Game Match Scores** for each **Compatible Game**. 
Its *weighted combination* of all **Attribute Match Scores** of a game.
```javascript
game_match = (
    category_match × category_weight
  + provider_match × provider_weight
  + theme_match × theme_weight
  + feature_match × feature_weight
  + paylines_match × paylines_weight
) / 5
```
| Variable | Definition |
|-|-|
| category_match | value from 8th step |
| category_weight | configurable number, e.g. 0.3 |
|  |  |
| provider_match | value from 8th step |
| provider_weight | configurable number, e.g. 0.2 |
|  |  |
| theme_match | value from 8th step |
| theme_weight | configurable number, e.g. 0.2 |
|  |  |
| feature_match | value from 8th step |
| feature_weight | configurable number, e.g. 0.2 |
|  |  |
| paylines_match | value from 8th step |
| paylines_weight | configurable number, e.g. 0.1 |

#### Step #10

Calculate **Normalized Player Interest** for each **Compatible Game**.
Convert integer calculated at step 4, to a 0-1 score.
```javascript
normalized_player_interest_score = 
    player_interest_score / player_interest_score_max
```
| Variable | Definition |
|-|-|
| player_interest_score | value from step 4 |
| player_interest_score_max | maximum of player_interest_score |

#### Step #11

Calculate **Popularity** for each **Compatible Game**.
It is a overall game measurment rather then one player activity.
```javascript
popularity =
  ln(1 + game_weekly_session_count)
  / ln(1 + game_weekly_session_count_max)
```
| Variable | Definition |
|-|-|
| game_weekly_session_count | amount of game sessions within **History** period |
| game_weekly_session_count_max | maximum of game_weekly_session_count |
| ln(...) | Natural logarithm; reduces the gap between moderately popular and extremely popular games |

#### Step #12

Calculate **Freshness** for each **Compatible Game** - measures how *recently* the game was *created*, using its *created_at* date. It does not depend on when the player last played it.
```javascript
freshness = exp(-age_days / 45)
```
| Variable | Definition |
|-|-|
| age_days | number of UTC calendar days between game created date and todays date |
| 45 | decay constant |

#### Step #13

Calculate **Editorial** for each **Compatible Game** - measures special/important markers defined by business, e.g. game is 'Top' or 'Featured'.
```text
editorial = 1 if game is Top or Featured, othrwise 0
```

#### Step #14

Identify **Familiar Candidates**.
A **Familiar Candidate** is a game which:
- Is a **Compatible Game** from step 7.
- Has a **Player Interest Score** from step 4 greater than `0`.

#### Step #15

Calculates a **Familiar Score** for each **Familiar Candidate**, 
```javascript
familiar_score =
    normalized_player_interest_score × familiar_interest_weight
  + game_match × familiar_content_weight
```
| Variable | Definition |
|-|-|
| normalized_player_interest_score | value from step 10 |
| familiar_interest_weight | configurable number, default 0.8 |
|  |  |
| game_match | value from step 9 |
| familiar_content_weight | configurable number, default 0.2 |

#### Step #16

Pick one game with the Highest **Familiar Score**

#### Step #17

Calculate **Penalized Selection Score** for rest of the games.
It is used to select second **Familiar Game** which is a little different from first one.
```javascript
similarity_to_first_game =
    0.40 × same_category
  + 0.20 × same_provider
  + 0.20 × theme_overlap
  + 0.20 × feature_overlap

penalized_selection_score_ =
  familiar_score
  − similarity_penalty × similarity_to_first_game
```
| Variable | Definition |
|-|-|
| same_category | 1 if categories match, otherwise 0 |
| same_provider | 1 if providers match, otherwise 0 |
| theme_overlap | Shared themes ÷ distinct themes across both games |
| feature_overlap | Shared features ÷ distinct features across both games |
|  |  |
| familiar_score | value from step 14 |
| similarity_penalty | configurable number, default 0.15 |

#### Step #18

Pick one game with the Highest **Penalized Selection Score**
**Familiar Games** been selected at this point.

#### Step #19

Identify **Discovery Candidates**.
A **Discovery Candidates** is a game which:
- Is a **Compatible Game** from step 7.
- Not a Favourite game.
- Was not played by user within **History** period.

#### Step #20

Calculate **Discovery Score** for each **Discovery Candidate**.
```javascript
discovery_score =
    game_match × discovery_content_weight
  + popularity × discovery_popularity_weight
  + freshness × discovery_freshness_weight
  + editorial × discovery_editorial_weight
```
| Variable | Definition |
|-|-|
| game_match | value from step 9 |
| discovery_content_weight | configurable number, default 0.7 |
|  |  |
| popularity | value from step 11 |
| discovery_popularity_weight | configurable number, default 0.2 |
|  |  |
| freshness | value from step 12 |
| discovery_freshness_weight | configurable number, default 0.05 |
|  |  |
| editorial | value from step 13 |
| discovery_editorial_weight | configurable number, default 0.05 |

#### Step #21

Smart Select 6 **Discovery Games** using **Discovery Score**, newly computed **Penalized Selection Score** (using same formula as in step 16), and applying few additional checks such as: no doublications, at most 3 games from same provider, at most 2 games wit hsame category/theme/feature.

#### Step #22

Identify **Exploration Candidates**.
A **Exploration Candidates** is a game which:
- Is a **Compatible Game** from step 7.
- Was never played by player.

#### Step #23

Calculate **Exploration Score** for each **Exploration Candidate**.
```javascript
exploration_score =
    game_match × exploration_content_weight
  + popularity × exploration_popularity_weight
  + freshness × exploration_freshness_weight
  + editorial × exploration_editorial_weight
```
| Variable | Definition |
|-|-|
| game_match | value from step 9 |
| discovery_content_weight | configurable number, default 0.5 |
|  |  |
| popularity | value from step 11 |
| discovery_popularity_weight | configurable number, default 0.35 |
|  |  |
| freshness | value from step 12 |
| discovery_freshness_weight | configurable number, default 0.15 |
|  |  |
| editorial | value from step 13 |
| exploration_editorial_weight | configurable number, default 0.05 |

#### Step #24

Smart Select 2 **Exploration Games** using **Exploration Score**, newly computed **Penalized Selection Score** (using same formula as in step 16).






