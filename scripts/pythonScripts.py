import sys
import pandas as pd
import json

csv = pd.read_csv('./private_csv/csv_user_name50703.csv')

new_csv = csv.dropna()

top_five_users = new_csv[new_csv['Age'] > 30].head(5)

coloum_mean = new_csv['Age'].mean()

coloum_std = new_csv['Age'].std()

coloum_median = new_csv['Age'].median()



def csvDataInsigts(fileName):
    result = {
        "coloum_mean" : round(coloum_mean, 2),
        "coloum_median" : round(coloum_median, 2),
        "coloum_std" : round(coloum_std, 2),
    }
    result = json.dumps(result)
    print(result)

# if __name__ == "__main__":
#     if sys.argv[1] == "csvDataInsigts":
#         fileName = sys.argv[2]
#         result = csvDataInsigts(fileName)
#         print(result)

csvDataInsigts('koko')