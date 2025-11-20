export default function Courses() {
  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">강의 목록</h1>

      <div className="mb-6">
        <input
          type="text"
          placeholder="강의 검색..."
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="w-full h-40 bg-gray-700 rounded-lg mb-4"></div>
          <h3 className="text-xl font-semibold mb-2">샘플 강의</h3>
          <p className="text-gray-400 mb-4">강의 설명이 여기에 표시됩니다.</p>
          <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition">
            자세히 보기
          </button>
        </div>
      </div>
    </div>
  )
}
