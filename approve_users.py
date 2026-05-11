import sqlite3
db_path = 'd:/PDD/globalchain/globalchain-backend/globalchain.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("UPDATE users SET status='Approved'")
conn.commit()
conn.close()
print("All users approved.")
