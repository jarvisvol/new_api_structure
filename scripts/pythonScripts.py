import sys
import pandas as pd

csv = pd.read_csv('../private_csv/User_Data.csv');

new_csv = csv.dropna()

top_five_users = new_csv[new_csv['Age'] > 30].head(5)

coloum_mean = new_csv['Age'].mean()

coloum_std = new_csv['Age'].std()

coloum_median = new_csv['Age'].median()



def csvDataInsigts():
    return [coloum_mean, coloum_median, coloum_std, top_five_users]

if __name__ == "__main__":
    # The first argument from Node.js is the function name
    if sys.argv[1] == "csvDataInsigts":
        result = csvDataInsigts()
        print(result)  # Output the result, which Node.js will capture