const YEAR = new Date().getFullYear()

export default {
  footer: (
    <small style={{ display: 'block', marginTop: '8rem' }}>
      {/* Here's where we removed the year and copyright text */}
      <style jsx>{`
        a {
          float: right;
        }
        @media screen and (max-width: 480px) {
          article {
            padding-top: 0.5rem;
            padding-bottom: 0.5rem;
          }
        }
      `}</style>
    </small>
  )
}

