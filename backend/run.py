import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="89.252.184.134",
        port=5004,
        reload=True,
        access_log=True
    )
